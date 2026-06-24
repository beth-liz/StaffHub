import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validationResult } from 'express-validator';
import ExcelJS from 'exceljs';
import Employee from '../models/Employee.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper — build a standard validation error response
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422);
    throw Object.assign(new Error('Validation failed'), {
      errors: errors.array().map((e) => e.msg),
    });
  }
};

// @desc    Get all employees with pagination, filtering & search
// @route   GET /api/employees
// @access  Private (Admin only)
export const getEmployees = async (req, res, next) => {
  try {
    const {
      search,
      department,
      status,
      page = 1,
      limit = 10,
      sort = '-createdAt',
    } = req.query;

    const query = {};

    // Department filter
    if (department) query.department = department;
    
    // Status filter
    if (status) query.status = status;

    // Text search across multiple fields
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { department: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('reportingManager', 'firstName lastName name employeeId')
        .lean(),
      Employee.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: employees.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private (Admin or Self)
export const getEmployeeById = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.id !== req.params.id) {
      res.status(403);
      throw new Error('Not authorized to access this employee profile');
    }

    const employee = await Employee.findById(req.params.id)
      .populate('reportingManager', 'firstName lastName name employeeId email');

    if (!employee) {
      res.status(404);
      throw new Error(`Employee not found with id ${req.params.id}`);
    }

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (Admin only)
export const createEmployee = async (req, res, next) => {
  try {
    handleValidationErrors(req, res);

    // Split name if provided instead of firstName/lastName for backward compatibility
    if (req.body.name && (!req.body.firstName || !req.body.lastName)) {
      const parts = req.body.name.trim().split(' ');
      req.body.firstName = parts[0] || '';
      req.body.lastName = parts.slice(1).join(' ') || '';
    }

    if (!req.body.firstName || !req.body.lastName) {
      res.status(400);
      throw new Error('Both First Name and Last Name are required');
    }

    // Default temporary password
    const tempPassword = req.body.password || 'Temp@1234';

    const employeeData = {
      ...req.body,
      password: tempPassword,
      isTempPassword: true,
    };

    if (employeeData.reportingManager !== undefined && employeeData.reportingManager.trim() === '') {
      employeeData.reportingManager = null;
    }

    const employee = await Employee.create(employeeData);

    // Initialize leave balance automatically for the new employee
    await LeaveBalance.create({ employeeId: employee._id });

    // Add Audit Log
    await AuditLog.create({
      action: 'Employee Created',
      performedBy: req.user.id,
      targetUser: employee._id,
      details: `Created employee ID ${employee.employeeId} (${employee.name}). Temporary password assigned.`,
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin or Self)
export const updateEmployee = async (req, res, next) => {
  try {
    handleValidationErrors(req, res);

    if (req.user.role !== 'Admin' && req.user.id !== req.params.id) {
      res.status(403);
      throw new Error('Not authorized to update this employee profile');
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error(`Employee not found with id ${req.params.id}`);
    }

    const updates = req.body;

    if (req.user.role !== 'Admin') {
      // Employee updates - allow updating phone, address, DOB, emergency info, marital, blood, gender
      const allowedFields = [
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postalCode',
        'emergencyContactName',
        'emergencyContactPhone',
        'bloodGroup',
        'maritalStatus',
        'gender',
        'dateOfBirth',
      ];
      allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
          employee[field] = updates[field];
        }
      });

      // Create Notification & Log
      await Notification.create({
        recipient: employee._id,
        title: 'Profile Updated',
        message: 'Your personal information was updated successfully.',
        type: 'Profile Updated',
      });

      await AuditLog.create({
        action: 'Profile Updated',
        performedBy: req.user.id,
        targetUser: employee._id,
        details: 'Employee updated personal contact fields',
      });
    } else {
      // Admin updates - can update everything
      const coreFields = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'role',
        'status',
        'department',
        'designation',
        'dateOfJoining',
        'dateOfBirth',
        'gender',
        'address',
        'city',
        'state',
        'country',
        'postalCode',
        'emergencyContactName',
        'emergencyContactPhone',
        'bloodGroup',
        'maritalStatus',
        'reportingManager',
        'isTempPassword',
      ];

      // Handle split name if raw 'name' parameter is passed by old views
      if (updates.name && (!updates.firstName || !updates.lastName)) {
        const parts = updates.name.trim().split(' ');
        updates.firstName = parts[0] || '';
        updates.lastName = parts.slice(1).join(' ') || '';
      }

      coreFields.forEach((field) => {
        if (updates[field] !== undefined) {
          if (field === 'reportingManager' && (!updates[field] || updates[field].trim() === '')) {
            employee[field] = null;
          } else {
            employee[field] = updates[field];
          }
        }
      });

      // Admin password reset
      if (updates.password) {
        employee.password = updates.password;
        employee.isTempPassword = updates.isTempPassword !== undefined ? updates.isTempPassword : true;

        await AuditLog.create({
          action: 'Password Reset by Admin',
          performedBy: req.user.id,
          targetUser: employee._id,
          details: 'Admin reset password and set temporary flag',
        });
      }

      await AuditLog.create({
        action: 'Employee Profile Modified',
        performedBy: req.user.id,
        targetUser: employee._id,
        details: `Admin updated fields for employee ID ${employee.employeeId}`,
      });
    }

    const updatedEmployee = await employee.save();

    res.status(200).json({ success: true, data: updatedEmployee });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      res.status(404);
      throw new Error(`Employee not found with id ${req.params.id}`);
    }

    // Delete associated balances and leaves
    await LeaveBalance.deleteOne({ employeeId: employee._id });
    await LeaveRequest.deleteMany({ employeeId: employee._id });
    await Notification.deleteMany({ recipient: employee._id });

    // Remove avatar file if it exists
    if (employee.profilePhoto) {
      const filePath = path.join(__dirname, '..', employee.profilePhoto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Add Audit Log
    await AuditLog.create({
      action: 'Employee Deleted',
      performedBy: req.user.id,
      details: `Admin deleted employee account ID ${employee.employeeId} (${employee.name})`,
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload / update employee avatar
// @route   POST /api/employees/:id/upload-avatar
// @access  Private (Admin or Self)
export const uploadAvatar = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.id !== req.params.id) {
      res.status(403);
      throw new Error('Not authorized to modify this profile photo');
    }

    if (!req.file) {
      res.status(400);
      throw new Error('No image file provided');
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error(`Employee not found with id ${req.params.id}`);
    }

    // Delete old photo if exists
    if (employee.profilePhoto) {
      const oldPath = path.join(__dirname, '..', employee.profilePhoto);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Store relative path (served as static)
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    employee.profilePhoto = relativePath;
    await employee.save();

    // Log the change
    await AuditLog.create({
      action: 'Profile Image Uploaded',
      performedBy: req.user.id,
      targetUser: employee._id,
      details: 'Uploaded new profile photo',
    });

    res.status(200).json({
      success: true,
      avatarUrl: relativePath,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export employees to Excel (.xlsx)
// @route   GET /api/employees/export
// @access  Private (Admin only)
export const exportEmployees = async (req, res, next) => {
  try {
    const { search, department, sort = 'name' } = req.query;

    const query = {};
    if (department) query.department = department;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { department: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    const employees = await Employee.find(query).sort(sort).lean();

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StaffHub Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Employees', {
      pageSetup: { fitToPage: true, orientation: 'landscape' },
    });

    // Header row styling
    sheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Phone Number', key: 'phone', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date Added', key: 'createdAt', width: 20 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // Add data rows
    employees.forEach((emp) => {
      const row = sheet.addRow({
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        role: emp.role,
        status: emp.status,
        createdAt: emp.createdAt
          ? new Date(emp.createdAt).toLocaleDateString()
          : '',
      });
      row.alignment = { vertical: 'middle' };
    });

    // Alternate row shading
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF' },
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
      `attachment; filename="employees-${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & stats (backward compatibility fallback)
// @route   GET /api/employees/stats
// @access  Private (Admin only)
export const getStats = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments();

    const departmentStats = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentEmployees = await Employee.find().sort('-createdAt').limit(5).lean();

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        departmentStats: departmentStats.map((dept) => ({
          name: dept._id,
          count: dept.count,
        })),
        recentEmployees,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export a specific employee's leave report to Excel (.xlsx)
// @route   GET /api/employees/:id/leave-report
// @access  Private (Admin only)
export const exportEmployeeLeaveReport = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();

    if (!employee) {
      res.status(404);
      return next(new Error('Employee not found'));
    }

    const leaves = await LeaveRequest.find({ employeeId: req.params.id })
      .sort('-createdAt')
      .lean();

    // Summary stats
    const totalLeaves = leaves.length;
    const approved = leaves.filter((l) => l.status === 'Approved').length;
    const rejected = leaves.filter((l) => l.status === 'Rejected').length;
    const pending = leaves.filter((l) => l.status === 'Pending').length;
    const clarification = leaves.filter((l) => l.status === 'Clarification Required').length;

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StaffHub Portal';
    workbook.created = new Date();

    const sheetName = employee.name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31) || 'Leave Report';
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { fitToPage: true, orientation: 'landscape' },
    });

    // Add Report Summary Section
    sheet.addRow([`Leave Report: ${employee.name}`]).font = { bold: true, size: 16 };
    sheet.addRow([]); // Blank row

    // Employee Details Section
    sheet.addRow(['Employee Details']).font = { bold: true, size: 12 };
    sheet.addRow(['Name', employee.name]);
    sheet.addRow(['Employee ID', employee.employeeId]);
    sheet.addRow(['Department', employee.department]);
    sheet.addRow(['Email', employee.email]);
    sheet.addRow(['Role', employee.role]);
    sheet.addRow([]); // Blank row

    // Report Metadata Section
    sheet.addRow(['Report Metadata']).font = { bold: true, size: 12 };
    sheet.addRow(['Generated By', req.user.name]);
    sheet.addRow(['Generated Date', new Date().toLocaleDateString()]);
    sheet.addRow(['Generated Time', new Date().toLocaleTimeString()]);
    sheet.addRow([]); // Blank row

    if (leaves.length === 0) {
      sheet.addRow(['No leave records found.']).font = { italic: true, color: { argb: 'FF888888' } };
    } else {
      // Summary Stats Section
      sheet.addRow(['Summary Stats']).font = { bold: true, size: 12 };
      sheet.addRow(['Total Leaves', totalLeaves]);
      sheet.addRow(['Approved Leaves', approved]);
      sheet.addRow(['Rejected Leaves', rejected]);
      sheet.addRow(['Pending Leaves', pending]);
      sheet.addRow(['Clarification Required', clarification]);
      sheet.addRow([]); // Blank row

      // Leave Details Table
      sheet.addRow(['Leave Details']).font = { bold: true, size: 14 };

      const headerRowIdx = sheet.lastRow.number + 1;
      const columns = [
        { header: 'Leave Type', key: 'leaveType', width: 20 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Total Days', key: 'totalDays', width: 12 },
        { header: 'Reason', key: 'reason', width: 35 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Admin Remarks', key: 'adminRemarks', width: 30 },
        { header: 'Applied Date', key: 'createdAt', width: 20 },
      ];

      // Set headers dynamically starting from headerRowIdx
      sheet.getRow(headerRowIdx).values = columns.map((c) => c.header);
      
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

      // Add data rows mapping by key index (since we bypassed typical sheet.columns)
      leaves.forEach((leave, index) => {
        const row = sheet.addRow([
          leave.leaveType,
          leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '',
          leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '',
          leave.totalDays,
          leave.reason,
          leave.status,
          leave.adminRemarks || '',
          leave.createdAt ? new Date(leave.createdAt).toLocaleString() : '',
        ]);
        
        row.alignment = { vertical: 'middle', wrapText: true };

        // Alternate row shading
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: index % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF' },
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      // Set column widths manually
      columns.forEach((col, i) => {
        sheet.getColumn(i + 1).width = col.width;
      });
    }

    const safeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_Leave_Report.xlsx`;

    // Stream response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
