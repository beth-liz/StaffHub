/**
 * Local Intent Engine — Fallback Natural Language Processor
 *
 * Used when Groq API is unavailable.
 * Matches keywords and executes the same `aiToolExecutor` methods as the main engine.
 */

import { executeTool } from './aiToolExecutor.js';
import { getSlotSession, setSlotSession, clearSlotSession, addToHistory } from './aiSessionManager.js';
import AIInteractionLog from '../models/AIInteractionLog.js';

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
    const day = today.getDay();
    const daysUntilNextMonday = (1 + 7 - day) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    return nextMonday;
  }

  const yyyymmdd = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    return new Date(yyyymmdd[0]);
  }

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

// Attempt to parse number for list selection
const extractNumber = (text) => {
  const match = text.match(/\b(?:number|num)?\s*(\d+)\b/i);
  if (match) return parseInt(match[1], 10);
  
  // Try words
  const words = text.toLowerCase();
  if (words.includes('first') || words.includes('one')) return 1;
  if (words.includes('second') || words.includes('two')) return 2;
  if (words.includes('third') || words.includes('three')) return 3;
  if (words.includes('fourth') || words.includes('four')) return 4;
  if (words.includes('fifth') || words.includes('five')) return 5;
  
  return null;
};

// Extract name 
const extractName = (text, prefix) => {
  const clean = text.toLowerCase().trim();
  const idx = clean.indexOf(prefix);
  if (idx !== -1) {
    // Extract words after prefix
    const after = text.slice(idx + prefix.length).trim();
    // Just take the first word or two
    const parts = after.split(' ');
    if (parts.length > 0) return parts[0].replace(/['s]/g, '');
  }
  return null;
};


// ─── Main Execution ───────────────────────────────────────────────────────────
export const runLocalIntentEngine = async ({ command, user }) => {
  const userId = user.id.toString();
  const cleanCommand = command.toLowerCase().trim();

  // 1. Check active slot-filling session
  const slotSession = getSlotSession(userId);
  if (slotSession) {
    if (slotSession.intent === 'APPLY_LEAVE') {
      const waiting = slotSession.waitingFor;

      if (waiting === 'leaveType') {
        const extracted = extractLeaveType(command);
        if (extracted) {
          slotSession.slots.leaveType = extracted;
          slotSession.waitingFor = null;
        }
      } else if (waiting === 'dates') {
        if (cleanCommand.includes('tomorrow')) {
          const tom = parseRelativeDate('tomorrow');
          slotSession.slots.startDate = tom;
          slotSession.slots.endDate = tom;
          slotSession.waitingFor = null;
        } else if (cleanCommand.includes('monday to wednesday')) {
          const start = parseRelativeDate('next monday');
          const end = new Date(start);
          end.setDate(start.getDate() + 2); // Wednesday
          slotSession.slots.startDate = start;
          slotSession.slots.endDate = end;
          slotSession.waitingFor = null;
        } else {
          const date = parseRelativeDate(command);
          slotSession.slots.startDate = date;
          slotSession.slots.endDate = date;
          slotSession.waitingFor = null;
        }
      } else if (waiting === 'reason') {
        slotSession.slots.reason = command.trim();
        slotSession.waitingFor = null;
      }

      return await processApplyLeaveSession(slotSession, user, command);
    }
  }

  // 2. Intent matching routing to executeTool
  
  // Navigation Dashboard
  if (cleanCommand.includes('dashboard') || cleanCommand === 'home') {
    return await handleToolExecution('navigateDashboard', {}, user, command);
  }

  // Navigation Profile
  if (cleanCommand.includes('profile')) {
    return await handleToolExecution('navigateProfile', {}, user, command);
  }

  // Navigation Settings
  if (cleanCommand.includes('settings') || cleanCommand.includes('preferences') || cleanCommand.includes('portal setting')) {
    return await handleToolExecution('navigateSettings', {}, user, command);
  }

  // Navigation Apply Leave
  if (cleanCommand.includes('apply leave page') || cleanCommand.includes('leave application form') || cleanCommand === 'apply for leave page') {
    return await handleToolExecution('navigateApplyLeave', {}, user, command);
  }

  // Navigation Leave Approvals (Admin)
  if (cleanCommand.includes('leave approval')) {
    return await handleToolExecution('navigateLeaveApprovals', {}, user, command);
  }

  // Navigation Employees
  if (cleanCommand.includes('employee directory') || cleanCommand.includes('employees')) {
    return await handleToolExecution('navigateEmployees', {}, user, command);
  }

  // Show Leave Balance
  if (cleanCommand.includes('balance') || cleanCommand.includes('leaves do i have')) {
    return await handleToolExecution('showLeaveBalance', {}, user, command);
  }

  // Show Leave History
  if (cleanCommand.includes('leave history') || cleanCommand.includes('my leave request')) {
    return await handleToolExecution('showLeaveHistory', {}, user, command);
  }

  // Show Pending Requests
  if (cleanCommand.includes('show pending') || cleanCommand.includes('pending leave') || cleanCommand.includes('pending requests')) {
    return await handleToolExecution('showPendingRequests', {}, user, command);
  }

  // Navigation Audit Logs
  if (cleanCommand.includes('audit log') || cleanCommand.includes('system log')) {
    return await handleToolExecution('navigateAuditLogs', {}, user, command);
  }

  // Navigation AI History / Logs
  if (cleanCommand.includes('ai history') || cleanCommand.includes('ai assistant log') || cleanCommand.includes('command log')) {
    return await handleToolExecution('navigateAIHistory', {}, user, command);
  }

  // Show Notifications
  if (cleanCommand.includes('show notifications') || cleanCommand.includes('my notifications')) {
    return await handleToolExecution('showNotifications', {}, user, command);
  }

  // Mark All Notifications Read
  if (cleanCommand.includes('mark all') && cleanCommand.includes('read')) {
    return await handleToolExecution('markAllNotificationsRead', {}, user, command);
  }

  // Mark Notification Read
  if (cleanCommand.includes('mark') && cleanCommand.includes('read')) {
    const num = extractNumber(cleanCommand);
    if (num) {
      return await handleToolExecution('markNotificationRead', { notificationNumber: num }, user, command);
    }
    // Fallback: just open notifications
    return await handleToolExecution('navigateNotifications', {}, user, command);
  }
  
  // Navigate Notifications (General)
  if (cleanCommand.includes('notifications')) {
    return await handleToolExecution('navigateNotifications', {}, user, command);
  }

  // Dark Mode
  if (cleanCommand.includes('dark mode')) {
    const enabled = !cleanCommand.includes('off') && !cleanCommand.includes('disable');
    return await handleToolExecution('toggleDarkMode', { enabled }, user, command);
  }

  // Excel Export
  if (cleanCommand.includes('export') && cleanCommand.includes('excel')) {
    return await handleToolExecution('exportEmployeesExcel', {}, user, command);
  }

  // Delete Employee
  if (cleanCommand.includes('delete employee') || cleanCommand.includes('remove employee')) {
    const num = extractNumber(cleanCommand);
    const name = extractName(cleanCommand, 'delete employee');
    if (num || name) {
      return await handleToolExecution('deleteEmployee', { employeeNumber: num, employeeName: name }, user, command);
    }
  }

  // Approve Leave
  if (cleanCommand.includes('approve')) {
    const num = extractNumber(cleanCommand);
    const name = extractName(cleanCommand, 'approve');
    if (num || name) {
      return await handleToolExecution('approveLeave', { leaveNumber: num, employeeName: name }, user, command);
    }
  }

  // Reject Leave
  if (cleanCommand.includes('reject')) {
    const num = extractNumber(cleanCommand);
    const name = extractName(cleanCommand, 'reject');
    if (num || name) {
      return await handleToolExecution('rejectLeave', { leaveNumber: num, employeeName: name }, user, command);
    }
  }

  // Search Employee
  if (cleanCommand.includes('search for') || cleanCommand.includes('find employee')) {
    const q = cleanCommand.replace('search for', '').replace('find employee', '').trim();
    if (q) {
      return await handleToolExecution('searchEmployee', { query: q }, user, command);
    }
  }

  // Apply Leave (Starts Slot Filling)
  if (
    cleanCommand.includes('apply leave') ||
    cleanCommand.includes('need leave') ||
    cleanCommand.includes('apply sick') ||
    cleanCommand.includes('apply casual')
  ) {
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

    let reason = null;
    const reasonKeywords = ['because of', 'because', 'due to', 'as i', 'since i', 'for a'];
    for (const kw of reasonKeywords) {
      const idx = cleanCommand.indexOf(kw);
      if (idx !== -1) {
        reason = command.slice(idx + kw.length).trim();
        break;
      }
    }

    const session = {
      intent: 'APPLY_LEAVE',
      slots: { leaveType, startDate, endDate, reason },
      waitingFor: null
    };

    setSlotSession(userId, session);
    return await processApplyLeaveSession(session, user, command);
  }

  // General fallback conversation
  const speechResponse = `I received: "${command}". I am in local processing mode and can help you with leave applications, checking balances, page navigation, and basic tasks.`;
  await AIInteractionLog.create({
    userId: user.id,
    command,
    detectedIntent: 'CONVERSATION',
    aiInterpretation: 'none',
    actionExecuted: 'none',
    status: 'Success'
  }).catch(() => {});
  
  addToHistory(userId, 'assistant', speechResponse);

  return { 
    success: true, 
    intent: 'CONVERSATION', 
    speechResponse,
    action: null,
    path: null,
    listItems: null
  };
};

// Helper for calling executeTool and formatting response
const handleToolExecution = async (functionName, args, user, command) => {
  const result = await executeTool(functionName, args, user, command);
  const speechResponse = result.toolResult?.message || "Action completed.";
  addToHistory(user.id.toString(), 'assistant', speechResponse);
  
  return {
    success: result.success,
    intent: result.intent,
    speechResponse,
    action: result.action,
    path: result.path,
    listItems: result.listItems
  };
};

// Process leave application slots
const processApplyLeaveSession = async (session, user, command) => {
  const userId = user.id.toString();

  if (!session.slots.leaveType) {
    session.waitingFor = 'leaveType';
    const resp = "What type of leave would you like?";
    addToHistory(userId, 'assistant', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  if (!session.slots.startDate || !session.slots.endDate) {
    session.waitingFor = 'dates';
    const resp = "Which dates should I use for your leave?";
    addToHistory(userId, 'assistant', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  if (!session.slots.reason) {
    session.waitingFor = 'reason';
    const resp = "What is the reason?";
    addToHistory(userId, 'assistant', resp);
    return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
  }

  // All slots present! Apply leave
  clearSlotSession(userId);
  
  const args = {
    leaveType: session.slots.leaveType,
    startDate: session.slots.startDate.toISOString().split('T')[0],
    endDate: session.slots.endDate.toISOString().split('T')[0],
    reason: session.slots.reason
  };

  return await handleToolExecution('applyLeave', args, user, command);
};
