import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AIInteractionLog from '../models/AIInteractionLog.js';

// In-memory slot filling sessions, keyed by userId string
const slotSessions = new Map();

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

// Simple relative date parsing helpers
const parseRelativeDate = (text) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const clean = text.toLowerCase().trim();

  if (clean.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  if (clean.includes('next monday')) {
    const nextMonday = new Date(today);
    // Find next Monday (1)
    const day = today.getDay();
    const daysUntilNextMonday = (1 + 7 - day) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    return nextMonday;
  }

  // Parse YYYY-MM-DD format
  const yyyymmdd = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    return new Date(yyyymmdd[0]);
  }

  // Fallback default: return today
  return today;
};

// Extract leave type from text
const extractLeaveType = (text) => {
  const clean = text.toLowerCase();
  if (clean.includes('sick')) return 'Sick Leave';
  if (clean.includes('casual')) return 'Casual Leave';
  if (clean.includes('earned') || clean.includes('vacation')) return 'Earned Leave';
  if (clean.includes('wfh') || clean.includes('work from home')) return 'Work From Home';
  if (clean.includes('emergency')) return 'Emergency Leave';
  if (clean.includes('loss of pay') || clean.includes('lop')) return 'Loss Of Pay';
  return null;
};

// Local Intent Matching & State Machine
export const runLocalIntentEngine = async ({ command, history = [], user }) => {
  const userId = user.id.toString();
  const cleanCommand = command.toLowerCase().trim();

  // 1. Check if user has an active slot filling session
  if (slotSessions.has(userId)) {
    const session = slotSessions.get(userId);

    if (session.intent === 'APPLY_LEAVE') {
      const waiting = session.waitingFor;

      if (waiting === 'leaveType') {
        const extracted = extractLeaveType(command);
        if (extracted) {
          session.slots.leaveType = extracted;
          session.waitingFor = null;
        }
      } else if (waiting === 'dates') {
        // Resolve dates
        if (cleanCommand.includes('tomorrow')) {
          const tom = parseRelativeDate('tomorrow');
          session.slots.startDate = tom;
          session.slots.endDate = tom;
          session.waitingFor = null;
        } else if (cleanCommand.includes('monday to wednesday')) {
          const start = parseRelativeDate('next monday');
          const end = new Date(start);
          end.setDate(start.getDate() + 2); // Wednesday
          session.slots.startDate = start;
          session.slots.endDate = end;
          session.waitingFor = null;
        } else {
          const date = parseRelativeDate(command);
          session.slots.startDate = date;
          session.slots.endDate = date;
          session.waitingFor = null;
        }
      } else if (waiting === 'reason') {
        session.slots.reason = command.trim();
        session.waitingFor = null;
      }

      return await processApplyLeaveSession(session, user, command);
    }
  }

  // 2. Intent matching
  let matchedIntent = null;
  let action = null;
  let path = null;
  let speechResponse = '';

  // Apply Leave
  if (
    cleanCommand.includes('apply leave') ||
    cleanCommand.includes('need leave') ||
    cleanCommand.includes('take leave') ||
    cleanCommand.includes('request leave') ||
    cleanCommand.includes('apply sick') ||
    cleanCommand.includes('apply casual')
  ) {
    matchedIntent = 'APPLY_LEAVE';
    const leaveType = extractLeaveType(command);
    let startDate = null;
    let endDate = null;

    if (cleanCommand.includes('tomorrow')) {
      const tom = parseRelativeDate('tomorrow');
      startDate = tom;
      endDate = tom;
    } else if (cleanCommand.includes('next monday')) {
      const mon = parseRelativeDate('next monday');
      startDate = mon;
      endDate = mon;
    } else if (cleanCommand.includes('next week')) {
      const mon = parseRelativeDate('next monday');
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      startDate = mon;
      endDate = fri;
    }

    // Try extracting reason
    let reason = null;
    const reasonIndex = cleanCommand.indexOf('because of');
    if (reasonIndex !== -1) {
      reason = command.slice(reasonIndex + 10).trim();
    } else {
      const dueIndex = cleanCommand.indexOf('due to');
      if (dueIndex !== -1) {
        reason = command.slice(dueIndex + 6).trim();
      } else {
        const forIndex = cleanCommand.indexOf('because i have');
        if (forIndex !== -1) {
          reason = command.slice(forIndex + 14).trim();
        }
      }
    }

    const session = {
      intent: 'APPLY_LEAVE',
      slots: { leaveType, startDate, endDate, reason },
      waitingFor: null
    };

    slotSessions.set(userId, session);
    return await processApplyLeaveSession(session, user, command);
  }

  // Approve Leave
  if (cleanCommand.includes('approve')) {
    matchedIntent = 'APPROVE_LEAVE';
    if (user.role !== 'Admin') {
      speechResponse = "Unauthorized: Only managers or administrators can approve leave requests.";
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Failed', speechResponse);
      return { success: false, intent: matchedIntent, speechResponse };
    }

    // Extract employee name
    let employeeName = '';
    const approveMatch = command.match(/approve\s+([a-zA-Z\s]+?)(?:'s)?\s+leave/i) || command.match(/approve\s+([a-zA-Z]+)/i);
    if (approveMatch) {
      employeeName = approveMatch[1].trim();
    }

    if (!employeeName || employeeName.toLowerCase() === 'request') {
      speechResponse = "Whose leave request would you like to approve?";
      // Store pending approval intent session
      slotSessions.set(userId, { intent: 'APPROVE_LEAVE', slots: { employeeName: null, remarks: 'Approved via AI Assistant' } });
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Pending Clarification', speechResponse);
      return { success: true, intent: matchedIntent, speechResponse };
    }

    return await executeApproveLeave(employeeName, 'Approved via AI Assistant', user, command);
  }

  // Reject Leave
  if (cleanCommand.includes('reject')) {
    matchedIntent = 'REJECT_LEAVE';
    if (user.role !== 'Admin') {
      speechResponse = "Unauthorized: Only managers can reject leave requests.";
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Failed', speechResponse);
      return { success: false, intent: matchedIntent, speechResponse };
    }

    let employeeName = '';
    const rejectMatch = command.match(/reject\s+([a-zA-Z\s]+?)(?:'s)?\s+leave/i) || command.match(/reject\s+([a-zA-Z]+)/i);
    if (rejectMatch) {
      employeeName = rejectMatch[1].trim();
    }

    if (!employeeName || employeeName.toLowerCase() === 'request') {
      speechResponse = "Whose leave request would you like to reject?";
      slotSessions.set(userId, { intent: 'REJECT_LEAVE', slots: { employeeName: null, remarks: 'Rejected via AI Assistant' } });
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Pending Clarification', speechResponse);
      return { success: true, intent: matchedIntent, speechResponse };
    }

    return await executeRejectLeave(employeeName, 'Rejected via AI Assistant', user, command);
  }

  // Show Leave Balance
  if (cleanCommand.includes('balance') || cleanCommand.includes('leaves do i have') || cleanCommand.includes('check balance')) {
    matchedIntent = 'SHOW_LEAVE_BALANCE';
    let balance = await LeaveBalance.findOne({ employeeId: user.id });
    if (!balance) {
      balance = await LeaveBalance.create({ employeeId: user.id });
    }

    speechResponse = `You have ${balance.sickLeave} days of Sick Leave, ${balance.casualLeave} days of Casual Leave, and ${balance.earnedLeave} days of Earned Leave remaining.`;
    await logAIInteraction(user.id, command, matchedIntent, 'showLeaveBalance', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse };
  }

  // Show Leave History
  if (cleanCommand.includes('history') || cleanCommand.includes('my leave request') || cleanCommand.includes('leave logs') || cleanCommand.includes('logs')) {
    matchedIntent = 'SHOW_LEAVE_HISTORY';
    action = 'NAVIGATE';
    path = '/leaves';
    speechResponse = "Opening your leave logs and history page.";
    await AuditLog.create({
      action: 'AI Navigation Action',
      performedBy: user.id,
      details: 'Navigated to leave history via local intent fallback'
    });
    await logAIInteraction(user.id, command, matchedIntent, 'showLeaveHistory', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Show Pending Requests (Approvals)
  if (cleanCommand.includes('pending') || cleanCommand.includes('approval')) {
    matchedIntent = 'SHOW_PENDING_REQUESTS';
    if (user.role !== 'Admin') {
      speechResponse = "Unauthorized: Only administrators can view pending approvals.";
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Failed', speechResponse);
      return { success: false, intent: matchedIntent, speechResponse };
    }
    action = 'NAVIGATE';
    path = '/leaves';
    speechResponse = "Opening pending staff leave approvals.";
    await AuditLog.create({
      action: 'AI Navigation Action',
      performedBy: user.id,
      details: 'Navigated to pending requests via local intent fallback'
    });
    await logAIInteraction(user.id, command, matchedIntent, 'showPendingRequests', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Navigate Dashboard
  if (cleanCommand.includes('dashboard')) {
    matchedIntent = 'NAVIGATE_DASHBOARD';
    action = 'NAVIGATE';
    path = '/';
    speechResponse = "Opening your dashboard page.";
    await logAIInteraction(user.id, command, matchedIntent, 'navigateDashboard', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Navigate Profile
  if (cleanCommand.includes('profile')) {
    matchedIntent = 'NAVIGATE_PROFILE';
    action = 'NAVIGATE';
    path = '/profile';
    speechResponse = "Opening your profile detail settings.";
    await logAIInteraction(user.id, command, matchedIntent, 'navigateProfile', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Navigate Notifications
  if (cleanCommand.includes('notifications')) {
    matchedIntent = 'NAVIGATE_NOTIFICATIONS';
    action = 'NAVIGATE';
    path = '/notifications';
    speechResponse = "Opening your notification panel.";
    await logAIInteraction(user.id, command, matchedIntent, 'navigateNotifications', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Navigate Settings
  if (cleanCommand.includes('settings') || cleanCommand.includes('preferences')) {
    matchedIntent = 'NAVIGATE_SETTINGS';
    action = 'NAVIGATE';
    path = '/settings';
    speechResponse = "Opening portal settings.";
    await logAIInteraction(user.id, command, matchedIntent, 'navigateSettings', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // Navigate Employees
  if (cleanCommand.includes('employee directory') || cleanCommand.includes('employee management') || cleanCommand.includes('directory') || cleanCommand.includes('employees')) {
    matchedIntent = 'NAVIGATE_EMPLOYEES';
    if (user.role !== 'Admin') {
      speechResponse = "Unauthorized: Only administrators can access employee records.";
      await logAIInteraction(user.id, command, matchedIntent, 'none', 'Failed', speechResponse);
      return { success: false, intent: matchedIntent, speechResponse };
    }
    action = 'NAVIGATE';
    path = '/employees';
    speechResponse = "Opening directory.";
    await logAIInteraction(user.id, command, matchedIntent, 'navigateEmployees', 'Success', speechResponse);
    return { success: true, intent: matchedIntent, speechResponse, action, path };
  }

  // General fallback conversation
  matchedIntent = 'CONVERSATION';
  speechResponse = `I received: "${command}". I am in local processing mode and can help you with leave applications, history checking, balance checks, approvals, and page navigation. Try saying: "Show my leave balance".`;
  await logAIInteraction(user.id, command, matchedIntent, 'none', 'Success', speechResponse);
  return { success: true, intent: matchedIntent, speechResponse };
};

// Process leave application slots
const processApplyLeaveSession = async (session, user, command) => {
  const userId = user.id.toString();

  if (!session.slots.leaveType) {
    session.waitingFor = 'leaveType';
    const resp = "What type of leave would you like?";
    await logAIInteraction(user.id, command, 'APPLY_LEAVE', 'none', 'Pending Clarification', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  if (!session.slots.startDate || !session.slots.endDate) {
    session.waitingFor = 'dates';
    const resp = "Which dates should I use for your leave?";
    await logAIInteraction(user.id, command, 'APPLY_LEAVE', 'none', 'Pending Clarification', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  if (!session.slots.reason) {
    session.waitingFor = 'reason';
    const resp = "What is the reason?";
    await logAIInteraction(user.id, command, 'APPLY_LEAVE', 'none', 'Pending Clarification', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  // All slots present! Apply leave
  try {
    const { leaveType, startDate, endDate, reason } = session.slots;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end < start) {
      throw new Error('End date cannot be before the start date.');
    }
    if (start < today) {
      throw new Error('Start date cannot be in the past.');
    }

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check overlap
    const overlap = await LeaveRequest.findOne({
      employeeId: user.id,
      status: { $in: ['Pending', 'Approved', 'Clarification Required'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
    });

    if (overlap) {
      throw new Error('You have already applied for leave during this date range.');
    }

    // Verify balance
    const balanceField = getBalanceField(leaveType);
    if (balanceField) {
      let balance = await LeaveBalance.findOne({ employeeId: user.id });
      if (!balance) {
        balance = await LeaveBalance.create({ employeeId: user.id });
      }

      if (balance[balanceField] < totalDays) {
        throw new Error(`Insufficient leave balance. You requested ${totalDays} days of ${leaveType}, but you only have ${balance[balanceField]} days remaining.`);
      }
    }

    // Create leave request
    await LeaveRequest.create({
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

    // Notify admins
    const admins = await Employee.find({ role: 'Admin', status: 'Active' });
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      title: 'New Leave Request Submitted',
      message: `${user.name} applied for ${leaveType} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${totalDays} days).`,
      type: 'New Leave Request'
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Audit Log
    await AuditLog.create({
      action: 'AI Applied Leave',
      performedBy: user.id,
      details: `Applied for ${leaveType} (${totalDays} days) from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} via local intent fallback`
    });

    slotSessions.delete(userId); // clear active session

    const speechResponse = "Leave applied successfully.";
    await logAIInteraction(user.id, command, 'APPLY_LEAVE', 'applyLeave', 'Success', speechResponse);
    return {
      success: true,
      intent: 'APPLY_LEAVE',
      speechResponse,
      leaveType,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      reason
    };

  } catch (err) {
    slotSessions.delete(userId);
    const speechResponse = `Could not apply leave: ${err.message}`;
    await logAIInteraction(user.id, command, 'APPLY_LEAVE', 'applyLeave', 'Failed', speechResponse);
    return { success: false, intent: 'APPLY_LEAVE', speechResponse };
  }
};

// Execute Leave Approval
const executeApproveLeave = async (employeeName, remarks, user, command) => {
  try {
    const matchingEmployees = await Employee.find({
      name: { $regex: employeeName, $options: 'i' }
    });

    if (matchingEmployees.length === 0) {
      throw new Error(`Could not find any employee named "${employeeName}".`);
    }

    const matchedIds = matchingEmployees.map(emp => emp._id);
    const pendingRequests = await LeaveRequest.find({
      employeeId: { $in: matchedIds },
      status: 'Pending'
    });

    if (pendingRequests.length === 0) {
      throw new Error(`No pending leave requests found for ${employeeName}.`);
    }
    if (pendingRequests.length > 1) {
      throw new Error(`Multiple pending leave requests found for ${employeeName}.`);
    }

    const requestToApprove = pendingRequests[0];
    const targetEmp = matchingEmployees.find(emp => emp._id.toString() === requestToApprove.employeeId.toString());

    // Deduct balance
    const balanceField = getBalanceField(requestToApprove.leaveType);
    if (balanceField) {
      let balance = await LeaveBalance.findOne({ employeeId: requestToApprove.employeeId });
      if (!balance) {
        balance = await LeaveBalance.create({ employeeId: requestToApprove.employeeId });
      }

      if (balance[balanceField] < requestToApprove.totalDays) {
        throw new Error(`Insufficient leave balance.`);
      }

      balance[balanceField] -= requestToApprove.totalDays;
      await balance.save();
    }

    requestToApprove.status = 'Approved';
    requestToApprove.adminRemarks = remarks;
    requestToApprove.approvedBy = user.id;
    requestToApprove.approvedAt = new Date();
    await requestToApprove.save();

    // Notify employee
    await Notification.create({
      recipient: requestToApprove.employeeId,
      title: 'Leave Request Approved',
      message: `Your request for ${requestToApprove.leaveType} has been approved. Remarks: "${remarks}"`,
      type: 'Leave Approved'
    });

    // Audit Log
    await AuditLog.create({
      action: 'AI Approved Leave',
      performedBy: user.id,
      targetUser: requestToApprove.employeeId,
      details: `Approved ${requestToApprove.leaveType} for ${targetEmp.name} via local intent fallback`
    });

    const speechResponse = `${targetEmp.name}'s leave request has been approved.`;
    await logAIInteraction(user.id, command, 'APPROVE_LEAVE', 'approveLeave', 'Success', speechResponse);
    return { success: true, intent: 'APPROVE_LEAVE', speechResponse };

  } catch (err) {
    const speechResponse = `Approval failed: ${err.message}`;
    await logAIInteraction(user.id, command, 'APPROVE_LEAVE', 'approveLeave', 'Failed', speechResponse);
    return { success: false, intent: 'APPROVE_LEAVE', speechResponse };
  }
};

// Execute Leave Rejection
const executeRejectLeave = async (employeeName, remarks, user, command) => {
  try {
    const matchingEmployees = await Employee.find({
      name: { $regex: employeeName, $options: 'i' }
    });

    if (matchingEmployees.length === 0) {
      throw new Error(`Could not find any employee named "${employeeName}".`);
    }

    const matchedIds = matchingEmployees.map(emp => emp._id);
    const pendingRequests = await LeaveRequest.find({
      employeeId: { $in: matchedIds },
      status: 'Pending'
    });

    if (pendingRequests.length === 0) {
      throw new Error(`No pending leave requests found for ${employeeName}.`);
    }
    if (pendingRequests.length > 1) {
      throw new Error(`Multiple pending leave requests found for ${employeeName}.`);
    }

    const requestToReject = pendingRequests[0];
    const targetEmp = matchingEmployees.find(emp => emp._id.toString() === requestToReject.employeeId.toString());

    requestToReject.status = 'Rejected';
    requestToReject.adminRemarks = remarks;
    requestToReject.approvedBy = user.id;
    await requestToReject.save();

    // Notify employee
    await Notification.create({
      recipient: requestToReject.employeeId,
      title: 'Leave Request Rejected',
      message: `Your request for ${requestToReject.leaveType} has been rejected. Remarks: "${remarks}"`,
      type: 'Leave Rejected'
    });

    // Audit Log
    await AuditLog.create({
      action: 'AI Rejected Leave',
      performedBy: user.id,
      targetUser: requestToReject.employeeId,
      details: `Rejected ${requestToReject.leaveType} for ${targetEmp.name} via local intent fallback`
    });

    const speechResponse = `${targetEmp.name}'s leave request has been rejected.`;
    await logAIInteraction(user.id, command, 'REJECT_LEAVE', 'rejectLeave', 'Success', speechResponse);
    return { success: true, intent: 'REJECT_LEAVE', speechResponse };

  } catch (err) {
    const speechResponse = `Rejection failed: ${err.message}`;
    await logAIInteraction(user.id, command, 'REJECT_LEAVE', 'rejectLeave', 'Failed', speechResponse);
    return { success: false, intent: 'REJECT_LEAVE', speechResponse };
  }
};

// Logging helper
const logAIInteraction = async (userId, command, intent, action, status, responseText) => {
  try {
    await AIInteractionLog.create({
      userId,
      command,
      detectedIntent: intent,
      aiInterpretation: responseText,
      actionExecuted: action,
      status
    });
  } catch (err) {
    console.error('Failed to write local AI interaction log:', err.message);
  }
};
