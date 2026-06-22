import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import ExcelJS from 'exceljs';

// Helper to get leave field name in LeaveBalance model
const getBalanceField = (leaveType) => {
  switch (leaveType) {
    case 'Casual Leave':
      return 'casualLeave';
    case 'Sick Leave':
      return 'sickLeave';
    case 'Earned Leave':
      return 'earnedLeave';
    default:
      return null;
  }
};

// @desc    Apply for a new leave
// @route   POST /api/leaves
// @access  Private
export const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Validation: End date cannot be before start date
    if (end < start) {
      res.status(400);
      throw new Error('End date cannot be before the start date');
    }

    // 2. Validation: Past dates not allowed for start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      res.status(400);
      throw new Error('Start date cannot be in the past');
    }

    // 3. Auto calculate total leave days
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 4. Overlap validation
    const overlap = await LeaveRequest.findOne({
      employeeId: req.user.id,
      status: { $in: ['Pending', 'Approved', 'Clarification Required'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlap) {
      res.status(400);
      throw new Error('You have already applied for leave during this date range.');
    }

    // 5. Leave balance verification for tracked types
    const balanceField = getBalanceField(leaveType);
    if (balanceField) {
      let balance = await LeaveBalance.findOne({ employeeId: req.user.id });
      if (!balance) {
        balance = await LeaveBalance.create({ employeeId: req.user.id });
      }

      if (balance[balanceField] < totalDays) {
        res.status(400);
        throw new Error(
          `Insufficient leave balance. You requested ${totalDays} days of ${leaveType}, but you only have ${balance[balanceField]} days remaining.`
        );
      }
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      employeeId: req.user.id,
      employeeName: req.user.name,
      department: req.user.department,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: 'Pending',
      voiceTranscript: req.body.voiceTranscript || '',
      speechLanguage: req.body.speechLanguage || '',
      speechConfidence: req.body.speechConfidence !== undefined && req.body.speechConfidence !== null && req.body.speechConfidence !== '' ? Number(req.body.speechConfidence) : null,
    });

    // Notify all Active Admins
    const admins = await Employee.find({ role: 'Admin', status: 'Active' });
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      title: 'New Leave Request Submitted',
      message: `${req.user.name} applied for ${leaveType} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${totalDays} days).`,
      type: 'New Leave Request',
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Add Audit Log
    await AuditLog.create({
      action: 'Leave Applied',
      performedBy: req.user.id,
      details: `Applied for ${leaveType} (${totalDays} days) from ${startDate} to ${endDate}`,
    });

    res.status(201).json({
      success: true,
      data: leaveRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave history
// @route   GET /api/leaves
// @access  Private
export const getLeaves = async (req, res, next) => {
  try {
    const { search, leaveType, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // Regular employees can only see their own requests
    if (req.user.role !== 'Admin') {
      query.employeeId = req.user.id;
    } else {
      // Admins can search by employeeName
      if (search) {
        query.employeeName = new RegExp(search, 'i');
      }
    }

    if (leaveType) query.leaveType = leaveType;
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(query).sort('-createdAt').skip(skip).limit(limitNum).lean(),
      LeaveRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: leaves.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: leaves,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave status (Approve / Reject / Clarification)
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin only)
export const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, adminRemarks } = req.body;

    if (!status || !['Approved', 'Rejected', 'Clarification Required'].includes(status)) {
      res.status(400);
      throw new Error('Please provide a valid status update');
    }

    if (!adminRemarks || !adminRemarks.trim()) {
      res.status(400);
      throw new Error('Admin remarks are required when updating leave request status');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      res.status(404);
      throw new Error(`Leave request not found with id ${req.params.id}`);
    }

    if (leaveRequest.status === 'Approved' && status !== 'Approved') {
      res.status(400);
      throw new Error('Already approved leave requests cannot be modified.');
    }

    // Deduct leave balance if status becomes Approved
    if (status === 'Approved' && leaveRequest.status !== 'Approved') {
      const balanceField = getBalanceField(leaveRequest.leaveType);
      if (balanceField) {
        let balance = await LeaveBalance.findOne({ employeeId: leaveRequest.employeeId });
        if (!balance) {
          balance = await LeaveBalance.create({ employeeId: leaveRequest.employeeId });
        }

        if (balance[balanceField] < leaveRequest.totalDays) {
          res.status(400);
          throw new Error(
            `Cannot approve leave. Employee has insufficient balance (${balance[balanceField]} days remaining vs ${leaveRequest.totalDays} requested)`
          );
        }

        // Deduct
        balance[balanceField] -= leaveRequest.totalDays;
        await balance.save();
      }
    }

    // Update leave record
    leaveRequest.status = status;
    leaveRequest.adminRemarks = adminRemarks.trim();
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    await leaveRequest.save();

    // Notify Employee
    let notifyType = 'Leave Clarification Requested';
    if (status === 'Approved') notifyType = 'Leave Approved';
    if (status === 'Rejected') notifyType = 'Leave Rejected';

    await Notification.create({
      recipient: leaveRequest.employeeId,
      title: `Leave Request ${status}`,
      message: `Your request for ${leaveRequest.leaveType} has been ${status.toLowerCase()}. Remarks: "${adminRemarks}"`,
      type: notifyType,
    });

    // Add Audit Log
    await AuditLog.create({
      action: `Leave Status Updated: ${status}`,
      performedBy: req.user.id,
      targetUser: leaveRequest.employeeId,
      details: `Updated request for ${leaveRequest.leaveType} to status ${status}. Remarks: ${adminRemarks}`,
    });

    res.status(200).json({
      success: true,
      data: leaveRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance
// @route   GET /api/leaves/balance
// @access  Private
export const getLeaveBalance = async (req, res, next) => {
  try {
    // Admins can check other employee's balance if targetEmployeeId query parameter is provided
    const employeeId =
      req.user.role === 'Admin' && req.query.employeeId
        ? req.query.employeeId
        : req.user.id;

    let balance = await LeaveBalance.findOne({ employeeId });
    if (!balance) {
      balance = await LeaveBalance.create({ employeeId });
    }

    res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export leaves to Excel (.xlsx)
// @route   GET /api/leaves/export
// @access  Private
export const exportLeaves = async (req, res, next) => {
  try {
    const { search, leaveType, status, sort = '-createdAt' } = req.query;

    const query = {};

    // Regular employees can only see their own requests
    if (req.user.role !== 'Admin') {
      query.employeeId = req.user.id;
    } else {
      // Admins can search by employeeName
      if (search) {
        query.employeeName = new RegExp(search, 'i');
      }
    }

    if (leaveType) query.leaveType = leaveType;
    if (status) query.status = status;

    const leaves = await LeaveRequest.find(query).populate('employeeId', 'employeeId').sort(sort).lean();

    // Summary stats
    const totalRequests = leaves.length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const clarification = leaves.filter(l => l.status === 'Clarification Required').length;

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StaffHub Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leave Report', {
      pageSetup: { fitToPage: true, orientation: 'landscape' },
    });

    // Add Report Summary Section
    sheet.addRow(['Leave Report Summary']).font = { bold: true, size: 14 };
    sheet.addRow(['Generated By', req.user.name]);
    sheet.addRow(['Generated Date/Time', new Date().toLocaleString()]);
    sheet.addRow([]); // Blank row
    sheet.addRow(['Total Requests', totalRequests]);
    sheet.addRow(['Approved', approved]);
    sheet.addRow(['Rejected', rejected]);
    sheet.addRow(['Pending', pending]);
    sheet.addRow(['Clarification Required', clarification]);
    sheet.addRow([]); // Blank row

    // Header row styling
    const headerRowIdx = sheet.lastRow.number + 1;
    const columns = [
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Employee ID', key: 'employeeIdStr', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Leave Type', key: 'leaveType', width: 18 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Total Days', key: 'totalDays', width: 12 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Admin Remarks', key: 'adminRemarks', width: 30 },
      { header: 'Applied Date', key: 'createdAt', width: 20 },
      { header: 'Last Updated Date', key: 'updatedAt', width: 20 },
    ];
    
    // Configure columns but offset for the summary rows above
    sheet.getRow(headerRowIdx).values = columns.map(c => c.header);
    
    // Set actual columns for data (does not affect rows before it)
    sheet.columns = columns;

    // Style header
    const headerRow = sheet.getRow(headerRowIdx);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Brand color
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // Add data rows
    leaves.forEach((leave) => {
      const row = sheet.addRow({
        employeeName: leave.employeeName,
        employeeIdStr: leave.employeeId?.employeeId || 'N/A',
        department: leave.department,
        leaveType: leave.leaveType,
        startDate: leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '',
        endDate: leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '',
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        adminRemarks: leave.adminRemarks || '',
        createdAt: leave.createdAt ? new Date(leave.createdAt).toLocaleString() : '',
        updatedAt: leave.updatedAt ? new Date(leave.updatedAt).toLocaleString() : '',
      });
      row.alignment = { vertical: 'middle', wrapText: true };
    });

    // Alternate row shading for data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > headerRowIdx) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: (rowNumber - headerRowIdx) % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF' },
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      }
    });

    // Stream response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Leave_Report_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
