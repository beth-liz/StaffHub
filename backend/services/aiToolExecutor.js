/**
 * AI Tool Executor — Database-Verified Operations
 *
 * Every mutation is verified against the database before reporting success.
 * Every action generates an AuditLog entry.
 * Returns post-action navigation paths.
 * Supports number-based selection via session listContext.
 */

import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AIInteractionLog from '../models/AIInteractionLog.js';
import { getListItemByNumber, setListContext, setPendingAction, getPendingAction, clearPendingAction } from './aiSessionManager.js';

// ─── Leave Balance Helper ─────────────────────────────────────────────────────
const getBalanceField = (leaveType) => {
  switch (leaveType) {
    case 'Casual Leave': return 'casualLeave';
    case 'Sick Leave': return 'sickLeave';
    case 'Earned Leave': return 'earnedLeave';
    default: return null;
  }
};

// ─── Auto-generate Employee ID ────────────────────────────────────────────────
const generateEmployeeId = async () => {
  const lastEmployee = await Employee.findOne({
    employeeId: { $regex: /^EMP-\d+$/ }
  }).sort({ employeeId: -1 }).lean();

  if (lastEmployee && lastEmployee.employeeId) {
    const lastNum = parseInt(lastEmployee.employeeId.replace('EMP-', ''), 10);
    return `EMP-${String(lastNum + 1).padStart(4, '0')}`;
  }
  return 'EMP-0001';
};

// ─── Resolve employee from name or number ─────────────────────────────────────
const resolveEmployee = async (employeeName, employeeNumber, userId) => {
  if (employeeNumber) {
    const item = getListItemByNumber(userId, employeeNumber);
    if (item && item.id) {
      const emp = await Employee.findById(item.id);
      if (emp) return emp;
    }
    throw new Error(`No employee found at number ${employeeNumber}. Please search again.`);
  }
  if (employeeName) {
    const matches = await Employee.find({ name: { $regex: employeeName, $options: 'i' } });
    if (matches.length === 0) throw new Error(`No employee found named "${employeeName}".`);
    if (matches.length === 1) return matches[0];
    // Multiple matches — store as list context for number-based selection
    const items = matches.map((e, i) => ({
      number: i + 1,
      id: e._id.toString(),
      label: `${e.name} — ${e.department} — ${e.designation}`,
      type: 'employee'
    }));
    setListContext(userId, items);
    const listText = items.map(it => `${it.number}. ${it.label}`).join('\n');
    throw new Error(`Multiple employees found. Please specify by number:\n${listText}`);
  }
  throw new Error('Please provide an employee name or number.');
};

// ─── Resolve leave request from name/number ───────────────────────────────────
const resolvePendingLeave = async (employeeName, leaveNumber, userId) => {
  if (leaveNumber) {
    const item = getListItemByNumber(userId, leaveNumber);
    if (item && item.id) {
      const req = await LeaveRequest.findById(item.id);
      if (req && req.status === 'Pending') return req;
      if (req) throw new Error(`Leave request #${leaveNumber} is already ${req.status}.`);
    }
    throw new Error(`No pending leave request found at number ${leaveNumber}. Try "show pending requests" first.`);
  }
  if (employeeName) {
    const matches = await Employee.find({ name: { $regex: employeeName, $options: 'i' } });
    if (matches.length === 0) throw new Error(`No employee found named "${employeeName}".`);
    const matchedIds = matches.map(e => e._id);
    const pending = await LeaveRequest.find({ employeeId: { $in: matchedIds }, status: 'Pending' }).sort('-createdAt');
    if (pending.length === 0) throw new Error(`No pending leave requests found for "${employeeName}".`);
    if (pending.length === 1) return pending[0];
    // Multiple — store as list context
    const items = pending.map((r, i) => {
      const emp = matches.find(e => e._id.toString() === r.employeeId.toString());
      return {
        number: i + 1,
        id: r._id.toString(),
        label: `${emp?.name || r.employeeName} — ${r.leaveType} — ${r.startDate.toLocaleDateString()} to ${r.endDate.toLocaleDateString()}`,
        type: 'leave'
      };
    });
    setListContext(userId, items);
    const listText = items.map(it => `${it.number}. ${it.label}`).join('\n');
    throw new Error(`Multiple pending requests found. Please specify by number:\n${listText}`);
  }
  throw new Error('Please provide an employee name or request number. Try "show pending requests" first.');
};


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION MAP
// ═══════════════════════════════════════════════════════════════════════════════

export const executeTool = async (functionName, functionArgs, user, command) => {
  let toolResult;
  let action = null;
  let path = null;
  let listItems = null;
  let status = 'Success';
  const intent = functionName.replace(/([A-Z])/g, '_$1').toUpperCase();

  console.log(`[AI] Tool Invoked: ${functionName}`);
  console.log(`[AI] Extracted Entities: ${JSON.stringify(functionArgs)}`);

  try {
    switch (functionName) {

      // ─── PREPARE LEAVE APPLICATION (Review Mode) ────────────────────────
      case 'prepareLeaveApplication': {
        const { leaveType, startDate, endDate, reason } = functionArgs;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (end < start) throw new Error('End date cannot be before the start date.');
        if (start < today) throw new Error('Start date cannot be in the past.');

        const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        const overlap = await LeaveRequest.findOne({
          employeeId: user.id,
          status: { $in: ['Pending', 'Approved', 'Clarification Required'] },
          $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        });
        if (overlap) throw new Error('You have already applied for leave during this date range.');

        const balanceField = getBalanceField(leaveType);
        if (balanceField) {
          let balance = await LeaveBalance.findOne({ employeeId: user.id });
          if (!balance) balance = await LeaveBalance.create({ employeeId: user.id });
          if (balance[balanceField] < totalDays) {
            throw new Error(`Insufficient leave balance. Requested ${totalDays} days of ${leaveType}, only ${balance[balanceField]} remaining.`);
          }
        }

        // Store as pending — do NOT submit yet
        setPendingAction(user.id, 'leave', { leaveType, startDate, endDate, totalDays, reason });

        toolResult = {
          success: true,
          message: `Here is your leave application for review:\n\nLeave Type: ${leaveType}\nFrom: ${startDate}\nTo: ${endDate}\nDays: ${totalDays}\nReason: ${reason}\n\nPlease say "confirm" or "submit" to apply, or "cancel" to discard.`,
          pendingReview: true
        };
        break;
      }

      // ─── SUBMIT LEAVE APPLICATION (After Review) ───────────────────────
      case 'submitLeaveApplication': {
        const pending = getPendingAction(user.id);
        if (!pending || pending.type !== 'leave') {
          throw new Error('No leave application is pending review. Please prepare one first by telling me your leave details.');
        }

        const { leaveType, startDate, endDate, totalDays, reason } = pending.data;
        const start = new Date(startDate);
        const end = new Date(endDate);

        const created = await LeaveRequest.create({
          employeeId: user.id,
          employeeName: user.name,
          department: user.department,
          leaveType,
          startDate: start,
          endDate: end,
          totalDays,
          reason,
          status: 'Pending',
          voiceTranscript: command
        });

        // VERIFY
        const verified = await LeaveRequest.findById(created._id);
        if (!verified) throw new Error('Leave creation failed — database verification failed.');

        const admins = await Employee.find({ role: 'Admin', status: 'Active' });
        if (admins.length > 0) {
          await Notification.insertMany(admins.map(a => ({
            recipient: a._id,
            title: 'New Leave Request Submitted',
            message: `${user.name} applied for ${leaveType} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${totalDays} days).`,
            type: 'New Leave Request'
          })));
        }

        await AuditLog.create({
          action: 'AI Applied Leave',
          performedBy: user.id,
          details: `Applied for ${leaveType} (${totalDays} days) from ${startDate} to ${endDate}`
        });

        clearPendingAction(user.id);

        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: `Leave request for ${leaveType} submitted successfully from ${startDate} to ${endDate} (${totalDays} days).` };
        break;
      }

      // ─── APPLY LEAVE (Legacy — direct apply, kept for backward compat) ──
      case 'applyLeave': {
        const { leaveType, startDate, endDate, reason } = functionArgs;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (end < start) throw new Error('End date cannot be before the start date.');
        if (start < today) throw new Error('Start date cannot be in the past.');

        const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        const overlap = await LeaveRequest.findOne({
          employeeId: user.id,
          status: { $in: ['Pending', 'Approved', 'Clarification Required'] },
          $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        });
        if (overlap) throw new Error('You have already applied for leave during this date range.');

        const balanceField = getBalanceField(leaveType);
        if (balanceField) {
          let balance = await LeaveBalance.findOne({ employeeId: user.id });
          if (!balance) balance = await LeaveBalance.create({ employeeId: user.id });
          if (balance[balanceField] < totalDays) {
            throw new Error(`Insufficient leave balance. Requested ${totalDays} days of ${leaveType}, only ${balance[balanceField]} remaining.`);
          }
        }

        const created = await LeaveRequest.create({
          employeeId: user.id,
          employeeName: user.name,
          department: user.department,
          leaveType,
          startDate: start,
          endDate: end,
          totalDays,
          reason,
          status: 'Pending',
          voiceTranscript: command
        });

        // VERIFY
        const verified = await LeaveRequest.findById(created._id);
        if (!verified) throw new Error('Leave creation failed — database verification failed.');

        const admins = await Employee.find({ role: 'Admin', status: 'Active' });
        if (admins.length > 0) {
          await Notification.insertMany(admins.map(a => ({
            recipient: a._id,
            title: 'New Leave Request Submitted',
            message: `${user.name} applied for ${leaveType} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${totalDays} days).`,
            type: 'New Leave Request'
          })));
        }

        await AuditLog.create({
          action: 'AI Applied Leave',
          performedBy: user.id,
          details: `Applied for ${leaveType} (${totalDays} days) from ${startDate} to ${endDate}`
        });

        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: `Leave request for ${leaveType} submitted successfully from ${startDate} to ${endDate} (${totalDays} days).` };
        break;
      }

      // ─── APPROVE LEAVE ────────────────────────────────────────────────────
      case 'approveLeave': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { employeeName, leaveNumber, remarks } = functionArgs;

        const req = await resolvePendingLeave(employeeName, leaveNumber, user.id);
        const emp = await Employee.findById(req.employeeId);

        const balanceField = getBalanceField(req.leaveType);
        if (balanceField) {
          let bal = await LeaveBalance.findOne({ employeeId: req.employeeId });
          if (!bal) bal = await LeaveBalance.create({ employeeId: req.employeeId });
          if (bal[balanceField] < req.totalDays) throw new Error('Insufficient leave balance for approval.');
          bal[balanceField] -= req.totalDays;
          await bal.save();
        }

        req.status = 'Approved';
        req.adminRemarks = remarks || 'Approved via AI Assistant';
        req.approvedBy = user.id;
        req.approvedAt = new Date();
        await req.save();

        // VERIFY
        const verified = await LeaveRequest.findById(req._id);
        if (!verified || verified.status !== 'Approved') throw new Error('Leave approval failed — database verification failed.');

        await Notification.create({
          recipient: req.employeeId,
          title: 'Leave Request Approved',
          message: `Your ${req.leaveType} has been approved. Remarks: "${req.adminRemarks}"`,
          type: 'Leave Approved'
        });

        await AuditLog.create({
          action: 'AI Approved Leave',
          performedBy: user.id,
          targetUser: req.employeeId,
          details: `Approved ${req.leaveType} for ${emp?.name || req.employeeName}. Remarks: ${req.adminRemarks}`
        });

        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: `Leave approved for ${emp?.name || req.employeeName}.` };
        break;
      }

      // ─── REJECT LEAVE ─────────────────────────────────────────────────────
      case 'rejectLeave': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { employeeName, leaveNumber, remarks } = functionArgs;

        const req = await resolvePendingLeave(employeeName, leaveNumber, user.id);
        const emp = await Employee.findById(req.employeeId);

        req.status = 'Rejected';
        req.adminRemarks = remarks || 'Rejected via AI Assistant';
        req.approvedBy = user.id;
        await req.save();

        // VERIFY — this is the bug fix: ensure status is actually Rejected
        const verified = await LeaveRequest.findById(req._id);
        if (!verified || verified.status !== 'Rejected') {
          throw new Error('Leave rejection failed — database verification shows status is not "Rejected".');
        }

        await Notification.create({
          recipient: req.employeeId,
          title: 'Leave Request Rejected',
          message: `Your ${req.leaveType} has been rejected. Remarks: "${req.adminRemarks}"`,
          type: 'Leave Rejected'
        });

        await AuditLog.create({
          action: 'AI Rejected Leave',
          performedBy: user.id,
          targetUser: req.employeeId,
          details: `Rejected ${req.leaveType} for ${emp?.name || req.employeeName}. Remarks: ${req.adminRemarks}`
        });

        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: `Leave rejected for ${emp?.name || req.employeeName}.` };
        break;
      }

      // ─── SHOW LEAVE BALANCE ───────────────────────────────────────────────
      case 'showLeaveBalance': {
        let balance = await LeaveBalance.findOne({ employeeId: user.id });
        if (!balance) balance = await LeaveBalance.create({ employeeId: user.id });
        toolResult = {
          success: true,
          message: `Your leave balance: Casual Leave: ${balance.casualLeave} days, Sick Leave: ${balance.sickLeave} days, Earned Leave: ${balance.earnedLeave} days.`,
          casualLeave: balance.casualLeave,
          sickLeave: balance.sickLeave,
          earnedLeave: balance.earnedLeave
        };
        break;
      }

      // ─── SHOW LEAVE HISTORY ───────────────────────────────────────────────
      case 'showLeaveHistory': {
        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: 'Opening your leave history page.' };
        break;
      }

      // ─── SHOW PENDING REQUESTS ────────────────────────────────────────────
      case 'showPendingRequests': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');

        const pending = await LeaveRequest.find({ status: 'Pending' }).sort('-createdAt').limit(20).lean();

        if (pending.length === 0) {
          toolResult = { success: true, message: 'No pending leave requests found.' };
          break;
        }

        const items = pending.map((r, i) => ({
          number: i + 1,
          id: r._id.toString(),
          label: `${r.employeeName} — ${r.leaveType} — ${new Date(r.startDate).toLocaleDateString()} to ${new Date(r.endDate).toLocaleDateString()} (${r.totalDays} days)`,
          type: 'leave'
        }));

        setListContext(user.id, items);
        listItems = items;

        const listText = items.map(it => `${it.number}. ${it.label}`).join('\n');
        action = 'NAVIGATE';
        path = '/leaves';
        toolResult = { success: true, message: `Found ${pending.length} pending requests:\n${listText}\n\nSay "approve number X" or "reject number X" to take action.` };
        break;
      }

      // ─── SHOW NOTIFICATIONS ───────────────────────────────────────────────
      case 'showNotifications': {
        action = 'NAVIGATE';
        path = '/notifications';
        
        const notifications = await Notification.find({ recipient: user.id }).sort('-createdAt').limit(20).lean();

        if (notifications.length === 0) {
          toolResult = { success: true, message: 'You have no notifications.' };
          break;
        }

        const items = notifications.map((n, i) => ({
          number: i + 1,
          id: n._id.toString(),
          label: `${n.isRead ? '✓' : '●'} ${n.title} — ${n.message.substring(0, 60)}...`,
          type: 'notification'
        }));

        setListContext(user.id, items);
        listItems = items;

        const unreadCount = notifications.filter(n => !n.isRead).length;
        const listText = items.map(it => `${it.number}. ${it.label}`).join('\n');
        action = 'NAVIGATE';
        path = '/notifications';
        toolResult = { success: true, message: `You have ${notifications.length} notifications (${unreadCount} unread):\n${listText}\n\nSay "mark notification X read" to mark one as read.` };
        break;
      }

      // ─── MARK NOTIFICATION READ ───────────────────────────────────────────
      case 'markNotificationRead': {
        const { notificationNumbers, descriptions, notificationNumber } = functionArgs;

        // Collect notification IDs to mark as read
        const idsToMark = [];
        const markedTitles = [];

        // 1. Handle array of numbers from listed context
        if (notificationNumbers && notificationNumbers.length > 0) {
          for (const num of notificationNumbers) {
            const item = getListItemByNumber(user.id, num);
            if (item && item.id) {
              idsToMark.push(item.id);
            }
          }
        }

        // 2. Handle single notificationNumber (backward compat)
        if (notificationNumber && !notificationNumbers) {
          const item = getListItemByNumber(user.id, notificationNumber);
          if (item && item.id) {
            idsToMark.push(item.id);
          }
        }

        // 3. Handle description/keyword search
        if (descriptions && descriptions.length > 0) {
          for (const desc of descriptions) {
            const regex = new RegExp(desc, 'i');
            const matches = await Notification.find({
              recipient: user.id,
              isRead: false,
              $or: [{ title: regex }, { message: regex }]
            }).lean();
            for (const m of matches) {
              if (!idsToMark.includes(m._id.toString())) {
                idsToMark.push(m._id.toString());
              }
            }
          }
        }

        if (idsToMark.length === 0) {
          throw new Error('No matching notifications found. Say "show notifications" first, then reference them by number or description.');
        }

        // Mark all matched notifications as read
        for (const nid of idsToMark) {
          const notification = await Notification.findOne({ _id: nid, recipient: user.id });
          if (notification) {
            notification.isRead = true;
            await notification.save();
            markedTitles.push(notification.title);
          }
        }

        // VERIFY
        const verifyResults = await Notification.find({ _id: { $in: idsToMark }, recipient: user.id });
        const allMarked = verifyResults.every(n => n.isRead === true);
        if (!allMarked) {
          throw new Error('Failed to mark some notifications as read — database verification failed.');
        }

        await AuditLog.create({
          action: 'AI Marked Notification Read',
          performedBy: user.id,
          details: `Marked ${markedTitles.length} notification(s) as read: ${markedTitles.join(', ')}`
        });

        action = 'NAVIGATE';
        path = '/notifications';
        const summary = markedTitles.length === 1
          ? `Notification "${markedTitles[0]}" marked as read.`
          : `${markedTitles.length} notifications marked as read: ${markedTitles.join(', ')}.`;
        toolResult = { success: true, message: summary };
        break;
      }

      // ─── MARK ALL NOTIFICATIONS READ ──────────────────────────────────────
      case 'markAllNotificationsRead': {
        const result = await Notification.updateMany(
          { recipient: user.id, isRead: false },
          { $set: { isRead: true } }
        );

        // VERIFY
        const remaining = await Notification.countDocuments({ recipient: user.id, isRead: false });
        if (remaining > 0) {
          throw new Error('Failed to mark all notifications as read — some remain unread.');
        }

        await AuditLog.create({
          action: 'AI Marked All Notifications Read',
          performedBy: user.id,
          details: `Marked ${result.modifiedCount} notifications as read`
        });

        action = 'NAVIGATE';
        path = '/notifications';
        toolResult = { success: true, message: `All notifications marked as read (${result.modifiedCount} updated).` };
        break;
      }

      // ─── PREPARE EMPLOYEE CREATION (Review Mode) ──────────────────────
      case 'prepareEmployeeCreation': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { firstName, lastName, email, phone, department, designation, role, gender } = functionArgs;

        if (!firstName || !lastName) throw new Error('Both first name and last name are required.');
        if (!email) throw new Error('Email address is required.');
        if (!phone || !/^\d{10}$/.test(phone)) throw new Error('Phone number must be exactly 10 digits.');
        if (!department) throw new Error('Department is required.');
        if (!designation) throw new Error('Designation is required.');

        // Check for duplicate email
        const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
        if (existingEmail) throw new Error(`An employee with email "${email}" already exists.`);

        // Store as pending — do NOT create yet
        setPendingAction(user.id, 'employee', { firstName, lastName, email, phone, department, designation, role: role || 'Employee', gender });

        toolResult = {
          success: true,
          message: `Here is the employee record for review:\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\nDepartment: ${department}\nDesignation: ${designation}\nRole: ${role || 'Employee'}${gender ? '\nGender: ' + gender : ''}\n\nPlease say "confirm" or "create" to proceed, or "cancel" to discard.`,
          pendingReview: true
        };
        break;
      }

      // ─── SUBMIT EMPLOYEE CREATION (After Review) ──────────────────────
      case 'submitEmployeeCreation': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');

        const pending = getPendingAction(user.id);
        if (!pending || pending.type !== 'employee') {
          throw new Error('No employee creation is pending review. Please prepare one first by providing employee details.');
        }

        const { firstName, lastName, email, phone, department, designation, role, gender } = pending.data;

        const employeeId = await generateEmployeeId();
        const tempPassword = 'Temp@1234';

        const employeeData = {
          employeeId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department: department.trim(),
          designation: designation.trim(),
          role: role || 'Employee',
          gender: gender || undefined,
          password: tempPassword,
          isTempPassword: true,
        };

        const created = await Employee.create(employeeData);

        // VERIFY
        const verified = await Employee.findById(created._id);
        if (!verified) throw new Error('Employee creation failed — database verification failed.');

        // Create leave balance
        await LeaveBalance.create({ employeeId: created._id });

        // Notification for admins
        const admins = await Employee.find({ role: 'Admin', status: 'Active', _id: { $ne: user.id } });
        if (admins.length > 0) {
          await Notification.insertMany(admins.map(a => ({
            recipient: a._id,
            title: 'New Employee Created',
            message: `${user.name} created employee ${verified.name} (${employeeId}) via AI Assistant.`,
            type: 'Employee Created'
          })));
        }

        await AuditLog.create({
          action: 'AI Created Employee',
          performedBy: user.id,
          targetUser: created._id,
          details: `Created employee ${verified.name} (${employeeId}). Temporary password assigned.`
        });

        clearPendingAction(user.id);

        action = 'NAVIGATE';
        path = '/employees';
        toolResult = {
          success: true,
          message: `Employee created successfully!\nName: ${verified.name}\nID: ${employeeId}\nEmail: ${email}\nDepartment: ${department}\nDesignation: ${designation}\nTemporary Password: ${tempPassword}\nNavigating to employee list.`
        };
        break;
      }

      // ─── CREATE EMPLOYEE (Legacy — direct create, kept for backward compat) ──
      case 'createEmployee': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { firstName, lastName, email, phone, department, designation, role, gender } = functionArgs;

        if (!firstName || !lastName) throw new Error('Both first name and last name are required.');
        if (!email) throw new Error('Email address is required.');
        if (!phone || !/^\d{10}$/.test(phone)) throw new Error('Phone number must be exactly 10 digits.');
        if (!department) throw new Error('Department is required.');
        if (!designation) throw new Error('Designation is required.');

        // Check for duplicate email
        const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
        if (existingEmail) throw new Error(`An employee with email "${email}" already exists.`);

        const employeeId = await generateEmployeeId();
        const tempPassword = 'Temp@1234';

        const employeeData = {
          employeeId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department: department.trim(),
          designation: designation.trim(),
          role: role || 'Employee',
          gender: gender || undefined,
          password: tempPassword,
          isTempPassword: true,
        };

        const created = await Employee.create(employeeData);

        // VERIFY
        const verified = await Employee.findById(created._id);
        if (!verified) throw new Error('Employee creation failed — database verification failed.');

        // Create leave balance
        await LeaveBalance.create({ employeeId: created._id });

        // Notification for admins
        const admins = await Employee.find({ role: 'Admin', status: 'Active', _id: { $ne: user.id } });
        if (admins.length > 0) {
          await Notification.insertMany(admins.map(a => ({
            recipient: a._id,
            title: 'New Employee Created',
            message: `${user.name} created employee ${verified.name} (${employeeId}) via AI Assistant.`,
            type: 'Employee Created'
          })));
        }

        await AuditLog.create({
          action: 'AI Created Employee',
          performedBy: user.id,
          targetUser: created._id,
          details: `Created employee ${verified.name} (${employeeId}). Temporary password assigned.`
        });

        action = 'NAVIGATE';
        path = '/employees';
        toolResult = {
          success: true,
          message: `Employee created successfully!\nName: ${verified.name}\nID: ${employeeId}\nEmail: ${email}\nDepartment: ${department}\nDesignation: ${designation}\nTemporary Password: ${tempPassword}\nNavigating to employee list.`
        };
        break;
      }

      // ─── DELETE EMPLOYEE ──────────────────────────────────────────────────
      case 'deleteEmployee': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { employeeName, employeeNumber } = functionArgs;

        const emp = await resolveEmployee(employeeName, employeeNumber, user.id);

        // Prevent self-deletion
        if (emp._id.toString() === user.id.toString()) {
          throw new Error('You cannot delete your own account.');
        }

        const empName = emp.name;
        const empId = emp.employeeId;

        await Employee.findByIdAndDelete(emp._id);
        await LeaveBalance.deleteOne({ employeeId: emp._id });
        await LeaveRequest.deleteMany({ employeeId: emp._id });
        await Notification.deleteMany({ recipient: emp._id });

        // VERIFY
        const verifyDeleted = await Employee.findById(emp._id);
        if (verifyDeleted) throw new Error('Employee deletion failed — record still exists in database.');

        await AuditLog.create({
          action: 'AI Deleted Employee',
          performedBy: user.id,
          details: `Deleted employee ${empName} (${empId})`
        });

        action = 'NAVIGATE';
        path = '/employees';
        toolResult = { success: true, message: `Employee ${empName} (${empId}) has been deleted. Navigating to employee list.` };
        break;
      }

      // ─── SEARCH EMPLOYEE ──────────────────────────────────────────────────
      case 'searchEmployee': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { query } = functionArgs;

        const searchRegex = new RegExp(query, 'i');
        const matches = await Employee.find({
          $or: [
            { name: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { department: searchRegex },
            { designation: searchRegex },
            { employeeId: searchRegex }
          ]
        }).limit(10).lean();

        if (matches.length === 0) {
          toolResult = { success: true, message: `No employees found matching "${query}".` };
          break;
        }

        const items = matches.map((e, i) => ({
          number: i + 1,
          id: e._id.toString(),
          label: `${e.name} — ${e.department} — ${e.designation} (${e.employeeId})`,
          type: 'employee'
        }));

        setListContext(user.id, items);
        listItems = items;

        const listText = items.map(it => `${it.number}. ${it.label}`).join('\n');
        toolResult = { success: true, message: `Found ${matches.length} employee(s):\n${listText}\n\nSay "view number X" or "delete number X" to take action.` };
        break;
      }

      // ─── VIEW EMPLOYEE ────────────────────────────────────────────────────
      case 'viewEmployee': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        const { employeeName, employeeNumber } = functionArgs;

        const emp = await resolveEmployee(employeeName, employeeNumber, user.id);

        action = 'NAVIGATE';
        path = `/employees/${emp._id}`;
        toolResult = {
          success: true,
          message: `Employee Details:\nName: ${emp.name}\nID: ${emp.employeeId}\nEmail: ${emp.email}\nPhone: ${emp.phone}\nDepartment: ${emp.department}\nDesignation: ${emp.designation}\nStatus: ${emp.status}\nRole: ${emp.role}`
        };
        break;
      }

      // ─── EXPORT EMPLOYEES EXCEL ───────────────────────────────────────────
      case 'exportEmployeesExcel': {
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');

        await AuditLog.create({
          action: 'AI Exported Excel',
          performedBy: user.id,
          details: 'Exported employee list to Excel via AI Assistant'
        });

        action = 'DOWNLOAD_EXCEL';
        path = '/api/employees/export';
        toolResult = { success: true, message: 'Exporting employees to Excel. Download will start automatically.' };
        break;
      }

      // ─── TOGGLE DARK MODE ─────────────────────────────────────────────────
      case 'toggleDarkMode': {
        const { enabled } = functionArgs;

        await AuditLog.create({
          action: 'AI Changed Theme',
          performedBy: user.id,
          details: `${enabled ? 'Enabled' : 'Disabled'} dark mode via AI Assistant`
        });

        action = 'TOGGLE_DARK_MODE';
        path = null;
        toolResult = { success: true, message: `Dark mode has been ${enabled ? 'enabled' : 'disabled'}.`, darkModeEnabled: enabled };
        break;
      }

      // ─── NAVIGATION TOOLS ────────────────────────────────────────────────
      case 'navigateDashboard':
        action = 'NAVIGATE'; path = '/';
        toolResult = { success: true, message: 'Opening dashboard.' };
        break;

      case 'navigateProfile':
        action = 'NAVIGATE'; path = '/profile';
        toolResult = { success: true, message: 'Opening profile.' };
        break;

      case 'navigateNotifications':
        action = 'NAVIGATE'; path = '/notifications';
        toolResult = { success: true, message: 'Opening notifications.' };
        break;

      case 'navigateSettings':
        action = 'NAVIGATE'; path = '/settings';
        toolResult = { success: true, message: 'Opening settings.' };
        break;

      case 'navigateEmployees':
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        action = 'NAVIGATE'; path = '/employees';
        toolResult = { success: true, message: 'Opening employee directory.' };
        break;

      case 'navigateAuditLogs':
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        action = 'NAVIGATE'; path = '/audit-logs';
        toolResult = { success: true, message: 'Opening system audit logs.' };
        break;

      case 'navigateAIHistory':
        if (user.role !== 'Admin') throw new Error('Sorry, you do not have permission to perform this action.');
        action = 'NAVIGATE'; path = '/ai-history';
        toolResult = { success: true, message: 'Opening AI command history.' };
        break;

      case 'navigateApplyLeave':
        action = 'NAVIGATE'; path = '/leaves/apply';
        toolResult = { success: true, message: 'Opening leave application form.' };
        break;

      // ─── PERFORM LOGOUT ─────────────────────────────────────────────────
      case 'performLogout': {
        await AuditLog.create({
          action: 'AI Triggered Logout',
          performedBy: user.id,
          details: `User ${user.name} logged out via AI Assistant`
        });

        action = 'LOGOUT';
        toolResult = { success: true, message: `Goodbye ${user.name}! Logging you out now. Have a great day!` };
        break;
      }

      default:
        throw new Error(`Unknown tool function: ${functionName}`);
    }
  } catch (err) {
    status = 'Failed';
    console.error(`[AI] Tool Execution Error (${functionName}): ${err.message}`);
    toolResult = { success: false, message: err.message };
  }

  console.log(`[AI] Execution Result: ${JSON.stringify(toolResult)}`);

  // Log interaction
  await AIInteractionLog.create({
    userId: user.id,
    command,
    detectedIntent: intent,
    aiInterpretation: JSON.stringify(functionArgs),
    actionExecuted: functionName,
    status
  }).catch(e => console.error('[AI] Failed to write interaction log:', e.message));

  return { toolResult, action, path, status, intent, functionArgs, listItems };
};
