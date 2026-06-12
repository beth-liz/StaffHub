import Employee from '../models/Employee.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Notification from '../models/Notification.js';

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
      // ─── ADMIN DASHBOARD METRICS ───────────────────────────────────────────

      // 1. Total Employees
      const totalEmployees = await Employee.countDocuments();

      // 2. Active Employees
      const activeEmployees = await Employee.countDocuments({ status: 'Active' });

      // 3. Employees on Leave Today
      const employeesOnLeaveToday = await LeaveRequest.countDocuments({
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      });

      // 4. Pending Leave Requests
      const pendingLeaveRequests = await LeaveRequest.countDocuments({ status: 'Pending' });

      // 5. Unique Departments count & list
      const departmentsList = await Employee.distinct('department');
      const totalDepartments = departmentsList.length;

      // 6. New Joiners This Month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const newJoinersThisMonth = await Employee.countDocuments({
        dateOfJoining: { $gte: firstDayOfMonth },
      });

      // ─── CHARTS DATA ───

      // A. Department Distribution
      const departmentDistribution = await Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // B. Monthly Hiring Trend (Last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const hiringTrendRaw = await Employee.aggregate([
        { $match: { dateOfJoining: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$dateOfJoining' },
              month: { $month: '$dateOfJoining' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Map raw trend aggregation to monthly names
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyHiringTrend = hiringTrendRaw.map((item) => ({
        month: `${months[item._id.month - 1]} ${item._id.year}`,
        count: item.count,
      }));

      // C. Leave Statistics (Grouped by Status)
      const leaveStatsRaw = await LeaveRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const leaveStatistics = {
        Pending: 0,
        Approved: 0,
        Rejected: 0,
        'Clarification Required': 0,
      };
      leaveStatsRaw.forEach((item) => {
        if (item._id in leaveStatistics) {
          leaveStatistics[item._id] = item.count;
        }
      });

      // ─── TABLES DATA ───

      // I. Recent Employees (limit 5)
      const recentEmployees = await Employee.find()
        .sort('-createdAt')
        .limit(5)
        .select('employeeId name firstName lastName department designation status profilePhoto');

      // II. Recent Leave Requests (limit 5)
      const recentLeaveRequests = await LeaveRequest.find()
        .sort('-createdAt')
        .limit(5)
        .select('employeeName leaveType startDate endDate status totalDays');

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalEmployees,
            activeEmployees,
            employeesOnLeaveToday,
            pendingLeaveRequests,
            totalDepartments,
            newJoinersThisMonth,
          },
          charts: {
            departmentDistribution: departmentDistribution.map((d) => ({
              name: d._id,
              count: d.count,
            })),
            monthlyHiringTrend,
            leaveStatistics,
          },
          tables: {
            recentEmployees,
            recentLeaveRequests,
          },
        },
      });
    } else {
      // ─── EMPLOYEE DASHBOARD METRICS ────────────────────────────────────────

      // 1. Employee Leave Balances
      let leaveBalance = await LeaveBalance.findOne({ employeeId: req.user.id });
      if (!leaveBalance) {
        leaveBalance = await LeaveBalance.create({ employeeId: req.user.id });
      }

      // 2. Personal Leave Requests Count by Status
      const leaveRequests = await LeaveRequest.find({ employeeId: req.user.id });
      const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending').length;
      const approvedLeaves = leaveRequests.filter((r) => r.status === 'Approved').length;
      const rejectedLeaves = leaveRequests.filter((r) => r.status === 'Rejected').length;

      // 3. Upcoming Leave Schedule (Approved, starting from today onwards)
      const upcomingLeaves = await LeaveRequest.find({
        employeeId: req.user.id,
        status: 'Approved',
        startDate: { $gte: todayStart },
      })
        .sort('startDate')
        .limit(5);

      // 4. Recent Notifications (limit 5)
      const recentNotifications = await Notification.find({ recipient: req.user.id })
        .sort('-createdAt')
        .limit(5);

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
            casualLeave: leaveBalance.casualLeave,
            sickLeave: leaveBalance.sickLeave,
            earnedLeave: leaveBalance.earnedLeave,
            totalLeaveBalance: leaveBalance.casualLeave + leaveBalance.sickLeave + leaveBalance.earnedLeave,
          },
          leaveStats: {
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
          },
          upcomingLeaves,
          recentNotifications,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
