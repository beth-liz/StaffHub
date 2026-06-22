/**
 * Local Intent Engine — Fallback Natural Language Processor
 *
 * Used when OpenAI API is unavailable.
 * Matches keywords and executes the same `aiToolExecutor` methods as the main engine.
 */

import { executeTool } from './aiToolExecutor.js';
import { getSlotSession, setSlotSession, clearSlotSession, addToHistory } from './aiSessionManager.js';
import AIInteractionLog from '../models/AIInteractionLog.js';

// ─── Month Name Map ───────────────────────────────────────────────────────────
const MONTH_MAP = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11
};

// ─── Day Name Map ─────────────────────────────────────────────────────────────
const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

// ─── Parse a single date expression ──────────────────────────────────────────
const parseSingleDate = (text) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const clean = text.toLowerCase().trim();

  // "today"
  if (clean === 'today') return new Date(today);

  // "tomorrow"
  if (clean === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // "day after tomorrow"
  if (clean.includes('day after tomorrow')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }

  // "next <day>" e.g. "next monday", "next wednesday"
  for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
    if (clean.includes('next ' + dayName) || clean === dayName) {
      const d = new Date(today);
      const current = d.getDay();
      const daysUntil = (dayNum + 7 - current) % 7 || 7;
      d.setDate(d.getDate() + daysUntil);
      return d;
    }
  }

  // "23 July" or "July 23" or "23 july 2026"
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    // "23 July" / "23 July 2026"
    const pattern1 = new RegExp(`(\\d{1,2})\\s+${monthName}(?:\\s+(\\d{4}))?`, 'i');
    const m1 = clean.match(pattern1);
    if (m1) {
      const year = m1[2] ? parseInt(m1[2]) : today.getFullYear();
      return new Date(year, monthNum, parseInt(m1[1]));
    }
    // "July 23" / "July 23 2026"
    const pattern2 = new RegExp(`${monthName}\\s+(\\d{1,2})(?:\\s+(\\d{4}))?`, 'i');
    const m2 = clean.match(pattern2);
    if (m2) {
      const year = m2[2] ? parseInt(m2[2]) : today.getFullYear();
      return new Date(year, monthNum, parseInt(m2[1]));
    }
  }

  // YYYY-MM-DD
  const iso = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(iso[0]);

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));

  return null;
};

// ─── Parse a date range from natural text ────────────────────────────────────
const parseDateRange = (text) => {
  const clean = text.toLowerCase().trim();

  // "from X to Y" / "from X till Y"
  const fromTo = clean.match(/from\s+(.+?)\s+(?:to|till|until)\s+(.+?)(?:\s+because|\s+due|\s+as\s+i|\s+since|\s+for\s+a|\s*$)/i);
  if (fromTo) {
    const start = parseSingleDate(fromTo[1]);
    const end = parseSingleDate(fromTo[2]);
    if (start && end) return { startDate: start, endDate: end };
  }

  // "X to Y" without "from" (e.g., "23 July to 25 July")
  const xToY = clean.match(/(\d{1,2}\s+\w+(?:\s+\d{4})?)\s+to\s+(\d{1,2}\s+\w+(?:\s+\d{4})?)/i);
  if (xToY) {
    const start = parseSingleDate(xToY[1]);
    const end = parseSingleDate(xToY[2]);
    if (start && end) return { startDate: start, endDate: end };
  }

  // "for X days starting Y" / "for X days from Y"
  const forDays = clean.match(/for\s+(\d+|two|three|four|five)\s+days?\s+(?:starting|from)\s+(.+)/i);
  if (forDays) {
    const numMap = { two: 2, three: 3, four: 4, five: 5 };
    const count = numMap[forDays[1]] || parseInt(forDays[1]);
    const start = parseSingleDate(forDays[2]);
    if (start && count) {
      const end = new Date(start);
      end.setDate(start.getDate() + count - 1);
      return { startDate: start, endDate: end };
    }
  }

  // "next week" = Monday to Friday
  if (clean.includes('next week')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = today.getDay();
    const daysUntilMonday = (1 + 7 - current) % 7 || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysUntilMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { startDate: monday, endDate: friday };
  }

  // Single date mentions
  if (clean.includes('tomorrow')) {
    const d = parseSingleDate('tomorrow');
    return { startDate: d, endDate: d };
  }

  if (clean.includes('day after tomorrow')) {
    const d = parseSingleDate('day after tomorrow');
    return { startDate: d, endDate: d };
  }

  // "next <day>" as single-day leave
  for (const dayName of Object.keys(DAY_MAP)) {
    if (clean.includes('next ' + dayName)) {
      const d = parseSingleDate('next ' + dayName);
      if (d) return { startDate: d, endDate: d };
    }
  }

  // Try parsing any date-looking substring
  for (const monthName of Object.keys(MONTH_MAP)) {
    if (clean.includes(monthName)) {
      const d = parseSingleDate(clean);
      if (d) return { startDate: d, endDate: d };
    }
  }

  return null;
};

// ─── Extract leave type from text ─────────────────────────────────────────────
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

// ─── Extract reason from text ─────────────────────────────────────────────────
const extractReason = (text) => {
  const clean = text.toLowerCase();
  const reasonKeywords = [
    'because of', 'because i', 'because',
    'due to', 'as i am', 'as i have', 'as i',
    'since i am', 'since i have', 'since i', 'since',
    'for a', 'for my',
    'i have a', 'i am not', 'i am',
    'i need to', 'i have to'
  ];
  for (const kw of reasonKeywords) {
    const idx = clean.indexOf(kw);
    if (idx !== -1) {
      let reason = text.slice(idx + kw.length).trim();
      // Clean up trailing punctuation
      reason = reason.replace(/[.!]+$/, '').trim();
      if (reason.length > 2) return reason;
    }
  }
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
        // Also check if user provided more info in this turn
        const reason = extractReason(command);
        if (reason && !slotSession.slots.reason) slotSession.slots.reason = reason;
        const dates = parseDateRange(command);
        if (dates && !slotSession.slots.startDate) {
          slotSession.slots.startDate = dates.startDate;
          slotSession.slots.endDate = dates.endDate;
        }
      } else if (waiting === 'dates') {
        const dates = parseDateRange(command);
        if (dates) {
          slotSession.slots.startDate = dates.startDate;
          slotSession.slots.endDate = dates.endDate;
          slotSession.waitingFor = null;
        } else {
          // Try single date
          const d = parseSingleDate(command);
          if (d) {
            slotSession.slots.startDate = d;
            slotSession.slots.endDate = d;
            slotSession.waitingFor = null;
          }
        }
        // Also check for reason in this turn
        const reason = extractReason(command);
        if (reason && !slotSession.slots.reason) slotSession.slots.reason = reason;
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
  if (cleanCommand.includes('export') || cleanCommand.includes('download')) {
    if (cleanCommand.includes('leave') || cleanCommand.includes('history') || cleanCommand.includes('log')) {
      return await handleToolExecution('downloadLeaveReport', {}, user, command);
    }
    if (cleanCommand.includes('excel') || cleanCommand.includes('employee')) {
      return await handleToolExecution('exportEmployeesExcel', {}, user, command);
    }
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

  // ─── Apply Leave (full single-sentence + slot filling) ────────────────────
  if (
    cleanCommand.includes('apply leave') ||
    cleanCommand.includes('apply for leave') ||
    cleanCommand.includes('apply a leave') ||
    cleanCommand.includes('need leave') ||
    cleanCommand.includes('need a leave') ||
    cleanCommand.includes('take leave') ||
    cleanCommand.includes('take a leave') ||
    cleanCommand.includes('apply sick') ||
    cleanCommand.includes('apply casual') ||
    cleanCommand.includes('apply earned') ||
    cleanCommand.includes('apply emergency') ||
    cleanCommand.includes('sick leave') ||
    cleanCommand.includes('casual leave') ||
    cleanCommand.includes('earned leave')
  ) {
    // Extract everything we can from this single sentence
    const leaveType = extractLeaveType(command);
    const dateRange = parseDateRange(command);
    const reason = extractReason(command);

    const session = {
      intent: 'APPLY_LEAVE',
      slots: {
        leaveType,
        startDate: dateRange?.startDate || null,
        endDate: dateRange?.endDate || null,
        reason
      },
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

// Process leave application slots — asks for ALL missing fields at once
const processApplyLeaveSession = async (session, user, command) => {
  const userId = user.id.toString();

  // Collect all missing fields
  const missing = [];
  if (!session.slots.leaveType) missing.push('leaveType');
  if (!session.slots.startDate || !session.slots.endDate) missing.push('dates');
  if (!session.slots.reason) missing.push('reason');

  // If nothing is missing, execute!
  if (missing.length === 0) {
    clearSlotSession(userId);
    
    const args = {
      leaveType: session.slots.leaveType,
      startDate: session.slots.startDate.toISOString().split('T')[0],
      endDate: session.slots.endDate.toISOString().split('T')[0],
      reason: session.slots.reason
    };

    return await handleToolExecution('applyLeave', args, user, command);
  }

  // Build a friendly prompt asking for ALL missing fields at once
  session.waitingFor = missing[0]; // track what we're waiting for (first priority)

  const parts = [];
  if (missing.includes('leaveType')) parts.push('what type of leave you would like to apply for');
  if (missing.includes('dates')) parts.push('when you would like the leave to begin and end');
  if (missing.includes('reason')) parts.push('the reason for the leave');

  // Build contextual, friendly response
  const collected = [];
  if (session.slots.leaveType) collected.push(session.slots.leaveType);
  if (session.slots.startDate) {
    const startStr = session.slots.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const endStr = session.slots.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    collected.push(startStr === endStr ? `on ${startStr}` : `from ${startStr} to ${endStr}`);
  }
  if (session.slots.reason) collected.push(`for "${session.slots.reason}"`);

  let resp;
  if (collected.length > 0) {
    resp = `Got it — ${collected.join(', ')}. Could you also tell me ${parts.join(' and ')}?`;
  } else {
    resp = `Sure, I can help with that! Could you tell me ${parts.join(', ')}?`;
  }

  addToHistory(userId, 'assistant', resp);
  return { success: true, intent: 'APPLY_LEAVE', speechResponse: resp };
};
