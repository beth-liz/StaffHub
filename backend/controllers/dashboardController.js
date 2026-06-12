import Employee from '../models/Employee.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Notification from '../models/Notification.js';
import logger from '../config/logger.js';

// ─── Default safe values returned when a DB query fails ─────────────────────
const ADMIN_DEFAULTS = {
  metrics: {
    totalEmployees: 0,
    activeEmployees: 0,
    employeesOnLeaveToday: 0,
    pendingLeaveRequests: 0,
    totalDepartments: 0,
    newJoinersThisMonth: 0,
  },
  charts: {
    departmentDistribution: [],
    monthlyHiringTrend: [],
    leaveStatistics: { Pending: 0, Approved: 0, Rejected: 0, 'Clarification Required': 0 },
  },
  tables: {
    recentEmployees: [],
    recentLeaveRequests: [],
  },
};

// Helper: safely run a DB query and return a default value on failure
const safeQuery = async (queryFn, fallback, label = 'query') => {
  try {
    return await queryFn();
  } catch (err) {
    logger.warn(`[DASHBOARD] ${label} failed: ${err.message}`);
    return fallback;
  }
};

// @desc    Get dashboard metrics based on role
// @route   GET /api/dashboard
// @access  Private
export const getDashboardData = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (req.user.role === 'Admin') {
      // ─── ADMIN DASHBOARD — all queries run in parallel, each safely ──────
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const [
        totalEmployees,
        activeEmployees,
        employeesOnLeaveToday,
        pendingLeaveRequests,
        departmentsList,
        newJoinersThisMonth,
        departmentDistribution,
        hiringTrendRaw,
        leaveStatsRaw,
        recentEmployees,
        recentLeaveRequests,
      ] = await Promise.all([
        safeQuery(() => Employee.countDocuments(), 0, 'totalEmployees'),
        safeQuery(() => Employee.countDocuments({ status: 'Active' }), 0, 'activeEmployees'),
        safeQuery(
          () => LeaveRequest.countDocuments({
            status: 'Approved',
            startDate: { $lte: todayEnd },
            endDate: { $gte: todayStart },
          }),
          0,
          'employeesOnLeaveToday'
        ),
        safeQuery(() => LeaveRequest.countDocuments({ status: 'Pending' }), 0, 'pendingLeaves'),
        safeQuery(() => Employee.distinct('department'), [], 'departmentsList'),
        safeQuery(
          () => Employee.countDocuments({ dateOfJoining: { $gte: firstDayOfMonth } }),
          0,
          'newJoiners'
        ),
        safeQuery(
          () => Employee.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          [],
          'deptDistribution'
        ),
        safeQuery(
          () => Employee.aggregate([
            { $match: { dateOfJoining: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: { year: { $year: '$dateOfJoining' }, month: { $month: '$dateOfJoining' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ]),
          [],
          'hiringTrend'
        ),
        safeQuery(
          () => LeaveRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
          [],
          'leaveStats'
        ),
        safeQuery(
          () => Employee.find()
            .sort('-createdAt')
            .limit(5)
            .select('employeeId name firstName lastName department designation status profilePhoto')
            .lean(),
          [],
          'recentEmployees'
        ),
        safeQuery(
          () => LeaveRequest.find()
            .sort('-createdAt')
            .limit(5)
            .select('employeeName leaveType startDate endDate status totalDays')
            .lean(),
          [],
          'recentLeaves'
        ),
      ]);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyHiringTrend = hiringTrendRaw.map((item) => ({
        month: `${months[item._id.month - 1]} ${item._id.year}`,
        count: item.count,
      }));

      const leaveStatistics = { Pending: 0, Approved: 0, Rejected: 0, 'Clarification Required': 0 };
      leaveStatsRaw.forEach((item) => {
        if (item._id in leaveStatistics) leaveStatistics[item._id] = item.count;
      });

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalEmployees,
            activeEmployees,
            employeesOnLeaveToday,
            pendingLeaveRequests,
            totalDepartments: departmentsList.length,
            newJoinersThisMonth,
          },
          charts: {
            departmentDistribution: departmentDistribution.map((d) => ({
              name: d._id || 'Unknown',
              count: d.count,
            })),
            monthlyHiringTrend,
            leaveStatistics,
          },
          tables: { recentEmployees, recentLeaveRequests },
        },
      });
    } else {
      // ─── EMPLOYEE DASHBOARD ───────────────────────────────────────────────

      // Ensure leave balance exists
      let leaveBalance = await safeQuery(
        () => LeaveBalance.findOne({ employeeId: req.user.id }).lean(),
        null,
        'leaveBalance'
      );

      if (!leaveBalance) {
        try {
          leaveBalance = await LeaveBalance.create({ employeeId: req.user.id });
        } catch (_) {
          leaveBalance = { casualLeave: 0, sickLeave: 0, earnedLeave: 0 };
        }
      }

      const [leaveRequests, upcomingLeaves, recentNotifications] = await Promise.all([
        safeQuery(
          () => LeaveRequest.find({ employeeId: req.user.id }).lean(),
          [],
          'leaveRequests'
        ),
        safeQuery(
          () => LeaveRequest.find({
            employeeId: req.user.id,
            status: 'Approved',
            startDate: { $gte: todayStart },
          }).sort('startDate').limit(5).lean(),
          [],
          'upcomingLeaves'
        ),
        safeQuery(
          () => Notification.find({ recipient: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .lean(),
          [],
          'notifications'
        ),
      ]);

      const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending').length;
      const approvedLeaves = leaveRequests.filter((r) => r.status === 'Approved').length;
      const rejectedLeaves = leaveRequests.filter((r) => r.status === 'Rejected').length;

      return res.status(200).json({
        success: true,
        data: {
          profile: {
            id: req.user.id,
            employeeId: req.user.employeeId,
            name: req.user.name,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            department: req.user.department,
            designation: req.user.designation,
            profilePhoto: req.user.profilePhoto,
            status: req.user.status,
          },
          leaveBalances: {
            casualLeave: leaveBalance.casualLeave ?? 0,
            sickLeave: leaveBalance.sickLeave ?? 0,
            earnedLeave: leaveBalance.earnedLeave ?? 0,
            totalLeaveBalance:
              (leaveBalance.casualLeave ?? 0) +
              (leaveBalance.sickLeave ?? 0) +
              (leaveBalance.earnedLeave ?? 0),
          },
          leaveStats: { pendingLeaves, approvedLeaves, rejectedLeaves },
          upcomingLeaves,
          recentNotifications,
        },
      });
    }
  } catch (error) {
    logger.error(`[DASHBOARD] Unexpected error: ${error.message}`, { stack: error.stack });
    next(error);
  }
};
