import OpenAI from 'openai';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AIInteractionLog from '../models/AIInteractionLog.js';
import { runLocalIntentEngine } from './localIntentEngine.js';

// ─── Provider Configuration ───────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing. Please set it in backend/.env');
    }
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
    });
  }
  return groqClient;
};

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
export const runStartupDiagnostics = async () => {
  console.log('\n──────────────────────────────────────────');
  console.log('  AI Voice Assistant — Startup Diagnostics');
  console.log('──────────────────────────────────────────');

  if (!process.env.GROQ_API_KEY) {
    console.warn('✗ GROQ_API_KEY not found — AI will run in local fallback mode only');
    console.log('──────────────────────────────────────────\n');
    return;
  }

  console.log('✓ GROQ_API_KEY loaded');

  try {
    const client = getGroqClient();
    // Lightweight connectivity check — send a minimal 1-token completion
    await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    });
    console.log('✓ Groq connectivity successful');
    console.log(`✓ Model available: ${GROQ_MODEL}`);
    console.log('✓ AI Assistant ready (Groq mode)');
  } catch (err) {
    console.error(`✗ Groq connection failed: ${err.message}`);
    console.warn('  Falling back to local intent engine for all requests.');
  }

  console.log('──────────────────────────────────────────\n');
};

// ─── Leave Balance Helper ─────────────────────────────────────────────────────
const getBalanceField = (leaveType) => {
  switch (leaveType) {
    case 'Casual Leave': return 'casualLeave';
    case 'Sick Leave': return 'sickLeave';
    case 'Earned Leave': return 'earnedLeave';
    default: return null;
  }
};

// ─── Groq Tool Schemas ────────────────────────────────────────────────────────
const tools = [
  {
    type: 'function',
    function: {
      name: 'applyLeave',
      description: 'Apply for a new leave request. Call ONLY when you have ALL of: leaveType, startDate, endDate, and reason. Otherwise ask clarifying questions.',
      parameters: {
        type: 'object',
        properties: {
          leaveType: {
            type: 'string',
            enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave', 'Loss Of Pay'],
            description: 'The type of leave.'
          },
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD. Resolve relative dates like "tomorrow" or "next Monday" from today\'s date.'
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD.'
          },
          reason: {
            type: 'string',
            description: 'Reason for the leave.'
          }
        },
        required: ['leaveType', 'startDate', 'endDate', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'approveLeave',
      description: 'Approve a pending leave request for a specific employee. Admin only.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee.' },
          remarks: { type: 'string', description: 'Approval remarks. Default: "Approved via AI Assistant".' }
        },
        required: ['employeeName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rejectLeave',
      description: 'Reject a pending leave request for a specific employee. Admin only.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee.' },
          remarks: { type: 'string', description: 'Rejection reason. Default: "Rejected via AI Assistant".' }
        },
        required: ['employeeName']
      }
    }
  },
  {
    type: 'function',
    function: { name: 'showLeaveHistory', description: 'Navigate to the leave history page.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'showLeaveBalance', description: 'Fetch and read out the current user\'s leave balances.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'showPendingRequests', description: 'Navigate to pending leave approvals. Admin only.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'navigateDashboard', description: 'Navigate to the dashboard.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'navigateProfile', description: 'Navigate to the user profile page.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'navigateNotifications', description: 'Navigate to notifications.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'navigateSettings', description: 'Navigate to portal settings.', parameters: { type: 'object', properties: {} } }
  },
  {
    type: 'function',
    function: { name: 'navigateEmployees', description: 'Navigate to the employee management directory. Admin only.', parameters: { type: 'object', properties: {} } }
  }
];

// ─── Tool Argument Safe Parser ────────────────────────────────────────────────
const safeParseArgs = (rawArgs) => {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object' && rawArgs !== null) return rawArgs;
  if (typeof rawArgs === 'string' && rawArgs.trim() === '') return {};
  try {
    const parsed = JSON.parse(rawArgs);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Attempt to salvage partial JSON from malformed Llama outputs
    try {
      const cleaned = rawArgs.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return JSON.parse(cleaned) || {};
    } catch {
      console.error('[AI] Failed to parse tool arguments:', rawArgs);
      return {};
    }
  }
};

// ─── Tool Execution ───────────────────────────────────────────────────────────
const executeTool = async (functionName, functionArgs, user, command) => {
  let toolResult;
  let action = null;
  let path = null;
  let status = 'Success';
  const intent = functionName.replace(/([A-Z])/g, '_$1').toUpperCase();

  console.log(`[AI] Tool Invoked: ${functionName}`);
  console.log(`[AI] Extracted Entities: ${JSON.stringify(functionArgs)}`);

  try {
    switch (functionName) {

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

        toolResult = { success: true, message: `Leave request for ${leaveType} submitted from ${startDate} to ${endDate}.` };
        break;
      }

      case 'approveLeave': {
        const { employeeName, remarks } = functionArgs;
        if (user.role !== 'Admin') throw new Error('Unauthorized: Only administrators can approve leave requests.');

        const matchingEmployees = await Employee.find({ name: { $regex: employeeName, $options: 'i' } });
        if (matchingEmployees.length === 0) throw new Error(`No employee found named "${employeeName}".`);

        const matchedIds = matchingEmployees.map(e => e._id);
        const pending = await LeaveRequest.find({ employeeId: { $in: matchedIds }, status: 'Pending' });
        if (pending.length === 0) throw new Error(`No pending leave requests found for ${employeeName}.`);
        if (pending.length > 1) throw new Error(`Multiple pending requests found for ${employeeName}. Please specify the leave type or date.`);

        const req = pending[0];
        const emp = matchingEmployees.find(e => e._id.toString() === req.employeeId.toString());

        const balanceField = getBalanceField(req.leaveType);
        if (balanceField) {
          let bal = await LeaveBalance.findOne({ employeeId: req.employeeId });
          if (!bal) bal = await LeaveBalance.create({ employeeId: req.employeeId });
          if (bal[balanceField] < req.totalDays) throw new Error(`Insufficient leave balance.`);
          bal[balanceField] -= req.totalDays;
          await bal.save();
        }

        req.status = 'Approved';
        req.adminRemarks = remarks || 'Approved via AI Assistant';
        req.approvedBy = user.id;
        req.approvedAt = new Date();
        await req.save();

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
          details: `Approved ${req.leaveType} for ${emp.name}. Remarks: ${req.adminRemarks}`
        });

        toolResult = { success: true, message: `Leave approved for ${emp.name}.` };
        break;
      }

      case 'rejectLeave': {
        const { employeeName, remarks } = functionArgs;
        if (user.role !== 'Admin') throw new Error('Unauthorized: Only administrators can reject leave requests.');

        const matchingEmployees = await Employee.find({ name: { $regex: employeeName, $options: 'i' } });
        if (matchingEmployees.length === 0) throw new Error(`No employee found named "${employeeName}".`);

        const matchedIds = matchingEmployees.map(e => e._id);
        const pending = await LeaveRequest.find({ employeeId: { $in: matchedIds }, status: 'Pending' });
        if (pending.length === 0) throw new Error(`No pending leave requests found for ${employeeName}.`);
        if (pending.length > 1) throw new Error(`Multiple pending requests found for ${employeeName}.`);

        const req = pending[0];
        const emp = matchingEmployees.find(e => e._id.toString() === req.employeeId.toString());

        req.status = 'Rejected';
        req.adminRemarks = remarks || 'Rejected via AI Assistant';
        req.approvedBy = user.id;
        await req.save();

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
          details: `Rejected ${req.leaveType} for ${emp.name}. Remarks: ${req.adminRemarks}`
        });

        toolResult = { success: true, message: `Leave rejected for ${emp.name}.` };
        break;
      }

      case 'showLeaveBalance': {
        let balance = await LeaveBalance.findOne({ employeeId: user.id });
        if (!balance) balance = await LeaveBalance.create({ employeeId: user.id });
        toolResult = {
          success: true,
          casualLeave: balance.casualLeave,
          sickLeave: balance.sickLeave,
          earnedLeave: balance.earnedLeave
        };
        break;
      }

      case 'showLeaveHistory':
        action = 'NAVIGATE'; path = '/leaves';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to leave history via Groq AI' });
        toolResult = { success: true, message: 'Showing leave history.' };
        break;

      case 'showPendingRequests':
        if (user.role !== 'Admin') throw new Error('Unauthorized: Admin only.');
        action = 'NAVIGATE'; path = '/leaves';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to pending requests via Groq AI' });
        toolResult = { success: true, message: 'Showing pending requests.' };
        break;

      case 'navigateDashboard':
        action = 'NAVIGATE'; path = '/';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to dashboard via Groq AI' });
        toolResult = { success: true, message: 'Opening dashboard.' };
        break;

      case 'navigateProfile':
        action = 'NAVIGATE'; path = '/profile';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to profile via Groq AI' });
        toolResult = { success: true, message: 'Opening profile.' };
        break;

      case 'navigateNotifications':
        action = 'NAVIGATE'; path = '/notifications';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to notifications via Groq AI' });
        toolResult = { success: true, message: 'Opening notifications.' };
        break;

      case 'navigateSettings':
        action = 'NAVIGATE'; path = '/settings';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to settings via Groq AI' });
        toolResult = { success: true, message: 'Opening settings.' };
        break;

      case 'navigateEmployees':
        if (user.role !== 'Admin') throw new Error('Unauthorized: Admin only.');
        action = 'NAVIGATE'; path = '/employees';
        await AuditLog.create({ action: 'AI Navigation Action', performedBy: user.id, details: 'Navigated to employee directory via Groq AI' });
        toolResult = { success: true, message: 'Opening employee directory.' };
        break;

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

  return { toolResult, action, path, status, intent, functionArgs };
};

// ─── Main Groq Chat Entry Point ───────────────────────────────────────────────
export const runOpenAIChat = async ({ command, history = [], user }) => {

  // ── Phase 1: Try Groq ──────────────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const client = getGroqClient();

      const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const formattedTime = new Date().toLocaleTimeString();
      const todayISO = new Date().toISOString().split('T')[0];

      const systemPrompt = `You are the AI Voice Assistant for StaffHub HRMS v2.
Current date: ${formattedDate}. Current time: ${formattedTime}. Today ISO: ${todayISO}.
Active user: Name: ${user.name}, Role: ${user.role}, Department: ${user.department}, Employee ID: ${user.employeeId}.

Rules:
1. Resolve relative dates ("tomorrow", "next Monday", "next week") to absolute YYYY-MM-DD based on today: ${todayISO}.
2. Only call applyLeave when you have ALL of: leaveType, startDate, endDate, reason. Otherwise ask for missing fields first.
3. Refuse admin operations (approve/reject/employees) if user role is not "Admin".
4. Keep responses short and natural for Text-to-Speech playback.
5. When a tool succeeds or fails, explain the outcome clearly.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: command }
      ];

      console.log(`[AI] Detected Intent: Sending to Groq (${GROQ_MODEL})`);

      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const responseMessage = response.choices[0].message;

      // ── Tool call path ─────────────────────────────────────────────────────
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = safeParseArgs(toolCall.function.arguments);

        const { toolResult, action, path, status, intent, functionArgs: parsedArgs } = await executeTool(
          functionName, functionArgs, user, command
        );

        // Ensure parsedArgs is always a plain object even for zero-param tools
        const safeArgs = parsedArgs && typeof parsedArgs === 'object' ? parsedArgs : {};

        // Send result back to Groq for a conversational final reply
        const secondResponse = await client.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            ...messages,
            responseMessage,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            }
          ],
          temperature: 0.3,
        });

        const finalMessage = secondResponse.choices[0].message.content;
        console.log(`[AI] Speech Response: ${finalMessage}`);

        return {
          success: status === 'Success',
          provider: 'groq',
          intent,
          speechResponse: finalMessage,
          action,
          path,
          history: [
            ...history,
            { role: 'user', content: command },
            { role: 'assistant', content: finalMessage }
          ],
          leaveType: safeArgs.leaveType || null,
          startDate: safeArgs.startDate || null,
          endDate: safeArgs.endDate || null,
          reason: safeArgs.reason || null
        };
      }

      // ── Text conversation path (clarification / chit-chat) ─────────────────
      const textReply = responseMessage.content || "I didn't quite understand that. Could you rephrase?";
      const isClarification = textReply.includes('?');
      console.log(`[AI] Detected Intent: CONVERSATION`);
      console.log(`[AI] Speech Response: ${textReply}`);

      await AIInteractionLog.create({
        userId: user.id,
        command,
        detectedIntent: 'CLARIFICATION_OR_CONVERSATION',
        aiInterpretation: textReply,
        actionExecuted: 'none',
        status: isClarification ? 'Pending Clarification' : 'Success'
      }).catch(e => console.error('[AI] Log error:', e.message));

      return {
        success: true,
        provider: 'groq',
        intent: 'CONVERSATION',
        speechResponse: textReply,
        action: null,
        path: null,
        history: [
          ...history,
          { role: 'user', content: command },
          { role: 'assistant', content: textReply }
        ]
      };

    } catch (groqError) {
      console.error(`[AI] Groq request failed: ${groqError.message}`);
      console.warn('[AI] Switching to local intent engine fallback...');
    }
  } else {
    console.warn('[AI] GROQ_API_KEY not set — using local intent engine.');
  }

  // ── Phase 2: Local intent engine fallback ──────────────────────────────────
  try {
    const fallbackResult = await runLocalIntentEngine({ command, history, user });
    const fallbackPrefix = "I'm temporarily unable to reach the AI service. Switching to local processing. ";

    return {
      ...fallbackResult,
      provider: 'fallback',
      speechResponse: fallbackPrefix + (fallbackResult.speechResponse || ''),
    };
  } catch (fallbackError) {
    console.error(`[AI] Local fallback also failed: ${fallbackError.message}`);
    return {
      success: false,
      provider: 'fallback',
      intent: 'ERROR',
      speechResponse: "I'm unable to process your request right now. Please try again shortly.",
      action: null,
      path: null,
      history
    };
  }
};
