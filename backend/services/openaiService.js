import OpenAI from 'openai';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AIInteractionLog from '../models/AIInteractionLog.js';

// Lazily initialize OpenAI client to prevent crashes if key is initially missing
let openaiClient = null;
const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing. Please configure OPENAI_API_KEY in the .env file.');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

// Helper to map leave types to LeaveBalance fields
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

// OpenAI Tool Call schemas
const tools = [
  {
    type: 'function',
    function: {
      name: 'applyLeave',
      description: 'Apply for a new leave request. Use this function when you have all parameters: leaveType, startDate, endDate, and reason.',
      parameters: {
        type: 'object',
        properties: {
          leaveType: {
            type: 'string',
            enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave', 'Loss Of Pay'],
            description: 'The type of leave being applied for.'
          },
          startDate: {
            type: 'string',
            description: 'The start date of the leave in YYYY-MM-DD format. Resolve relative dates (like "tomorrow" or "next Monday") relative to the current local time context.'
          },
          endDate: {
            type: 'string',
            description: 'The end date of the leave in YYYY-MM-DD format. Resolve relative dates relative to the current local time context.'
          },
          reason: {
            type: 'string',
            description: 'The explanation or reason for the requested time-off.'
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
      description: 'Approve a pending leave request for a specific employee. (Admin only).',
      parameters: {
        type: 'object',
        properties: {
          employeeName: {
            type: 'string',
            description: 'The name (first name, last name, or full name) of the employee whose request should be approved.'
          },
          remarks: {
            type: 'string',
            description: 'Approval remarks or decision notes. Mandatory (default to "Approved via AI Assistant" if not provided).'
          }
        },
        required: ['employeeName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rejectLeave',
      description: 'Reject a pending leave request for a specific employee. (Admin only).',
      parameters: {
        type: 'object',
        properties: {
          employeeName: {
            type: 'string',
            description: 'The name of the employee whose request should be rejected.'
          },
          remarks: {
            type: 'string',
            description: 'Rejection remarks or reasons. Mandatory (default to "Rejected via AI Assistant" if not provided).'
          }
        },
        required: ['employeeName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showLeaveHistory',
      description: 'Display the leave logs / history page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showLeaveBalance',
      description: 'Check and state the remaining leave balances (casual, sick, earned) for the current user.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showPendingRequests',
      description: 'Navigate to the pending leave approvals page (Admin only).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateDashboard',
      description: 'Navigate to the dashboard main page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateProfile',
      description: 'Navigate to the profile page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateNotifications',
      description: 'Navigate to the notifications panel.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateSettings',
      description: 'Navigate to portal settings or preferences.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateEmployees',
      description: 'Navigate to the employee list / management panel (Admin only).',
      parameters: { type: 'object', properties: {} }
    }
  }
];

export const runOpenAIChat = async ({ command, history = [], user }) => {
  const openai = getOpenAIClient();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = new Date().toLocaleTimeString();

  // Create the base system prompt specifying the context
  const systemPrompt = `You are the AI Voice Assistant for StaffHub HRMS v2.
Current local date: ${formattedDate}.
Current local time: ${formattedTime}.
Current active user:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Department: ${user.department}
- Employee ID: ${user.employeeId}

Instructions:
1. Translate relative date expressions (e.g. "tomorrow", "next Monday", "next week") to absolute dates (YYYY-MM-DD) based on today's date context (${new Date().toISOString().split('T')[0]}).
2. If you need parameters to apply leave (leaveType, startDate, endDate, reason), do NOT make the function call. Instead, ask the user clarification questions one by one or in a group to collect all necessary details.
3. If the user is requesting Admin operations (approving, rejecting leaves, viewing employee lists) but their role is NOT "Admin", politely refuse to execute the operation.
4. Keep your responses short, natural, and conversational so they sound good when spoken aloud by a Text-to-Speech (TTS) engine.
5. If executing a command requires calling a tool, select the appropriate tool. If the operation succeeds or fails, explain the outcome naturally to the user.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: command }
  ];

  // Invoke OpenAI completion
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    tools,
    tool_choice: 'auto'
  });

  const responseMessage = response.choices[0].message;

  // Check if a tool call was triggered
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    const toolCall = responseMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    let toolResult;
    let action = null;
    let path = null;
    let status = 'Success';
    let details = '';
    const intent = functionName.replace(/([A-Z])/g, '_$1').toUpperCase();

    try {
      switch (functionName) {
        case 'applyLeave': {
          const { leaveType, startDate, endDate, reason } = functionArgs;

          const start = new Date(startDate);
          const end = new Date(endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (end < start) {
            throw new Error('End date cannot be before the start date');
          }
          if (start < today) {
            throw new Error('Start date cannot be in the past');
          }

          const diffTime = Math.abs(end - start);
          const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          // Check overlap
          const overlap = await LeaveRequest.findOne({
            employeeId: user.id,
            status: { $in: ['Pending', 'Approved', 'Clarification Required'] },
            $or: [
              { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
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

          // Create request
          const leaveRequest = await LeaveRequest.create({
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
            details: `Applied for ${leaveType} (${totalDays} days) from ${startDate} to ${endDate}`
          });

          details = `Applied for ${leaveType} (${totalDays} days) from ${startDate} to ${endDate}`;
          toolResult = {
            success: true,
            message: `Leave request for ${leaveType} submitted successfully from ${startDate} to ${endDate}.`
          };
          break;
        }

        case 'approveLeave': {
          const { employeeName, remarks } = functionArgs;
          if (user.role !== 'Admin') {
            throw new Error('Unauthorized: Only administrators can approve leave requests.');
          }

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
            throw new Error(`Multiple pending leave requests found for ${employeeName}. Please specify the type of leave or date.`);
          }

          const requestToApprove = pendingRequests[0];
          const targetEmp = matchingEmployees.find(emp => emp._id.toString() === requestToApprove.employeeId.toString());

          // Check and deduct balance
          const balanceField = getBalanceField(requestToApprove.leaveType);
          if (balanceField) {
            let balance = await LeaveBalance.findOne({ employeeId: requestToApprove.employeeId });
            if (!balance) {
              balance = await LeaveBalance.create({ employeeId: requestToApprove.employeeId });
            }

            if (balance[balanceField] < requestToApprove.totalDays) {
              throw new Error(`Cannot approve leave. Employee has insufficient balance (${balance[balanceField]} days remaining vs ${requestToApprove.totalDays} requested)`);
            }

            balance[balanceField] -= requestToApprove.totalDays;
            await balance.save();
          }

          requestToApprove.status = 'Approved';
          requestToApprove.adminRemarks = remarks || 'Approved via AI Assistant';
          requestToApprove.approvedBy = user.id;
          requestToApprove.approvedAt = new Date();
          await requestToApprove.save();

          // Notify employee
          await Notification.create({
            recipient: requestToApprove.employeeId,
            title: 'Leave Request Approved',
            message: `Your request for ${requestToApprove.leaveType} has been approved. Remarks: "${requestToApprove.adminRemarks}"`,
            type: 'Leave Approved'
          });

          // Audit Log
          await AuditLog.create({
            action: 'AI Approved Leave',
            performedBy: user.id,
            targetUser: requestToApprove.employeeId,
            details: `Approved ${requestToApprove.leaveType} for ${targetEmp.name}. Remarks: ${requestToApprove.adminRemarks}`
          });

          details = `Approved ${requestToApprove.leaveType} for ${targetEmp.name}`;
          toolResult = {
            success: true,
            message: `Leave request for ${targetEmp.name} approved successfully.`
          };
          break;
        }

        case 'rejectLeave': {
          const { employeeName, remarks } = functionArgs;
          if (user.role !== 'Admin') {
            throw new Error('Unauthorized: Only administrators can reject leave requests.');
          }

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
            throw new Error(`Multiple pending leave requests found for ${employeeName}. Please specify request details.`);
          }

          const requestToReject = pendingRequests[0];
          const targetEmp = matchingEmployees.find(emp => emp._id.toString() === requestToReject.employeeId.toString());

          requestToReject.status = 'Rejected';
          requestToReject.adminRemarks = remarks || 'Rejected via AI Assistant';
          requestToReject.approvedBy = user.id;
          await requestToReject.save();

          // Notify employee
          await Notification.create({
            recipient: requestToReject.employeeId,
            title: 'Leave Request Rejected',
            message: `Your request for ${requestToReject.leaveType} has been rejected. Remarks: "${requestToReject.adminRemarks}"`,
            type: 'Leave Rejected'
          });

          // Audit Log
          await AuditLog.create({
            action: 'AI Rejected Leave',
            performedBy: user.id,
            targetUser: requestToReject.employeeId,
            details: `Rejected ${requestToReject.leaveType} for ${targetEmp.name}. Remarks: ${requestToReject.adminRemarks}`
          });

          details = `Rejected ${requestToReject.leaveType} for ${targetEmp.name}`;
          toolResult = {
            success: true,
            message: `Leave request for ${targetEmp.name} rejected.`
          };
          break;
        }

        case 'showLeaveBalance': {
          let balance = await LeaveBalance.findOne({ employeeId: user.id });
          if (!balance) {
            balance = await LeaveBalance.create({ employeeId: user.id });
          }

          toolResult = {
            success: true,
            casualLeave: balance.casualLeave,
            sickLeave: balance.sickLeave,
            earnedLeave: balance.earnedLeave
          };
          details = 'Checked remaining leave allowances';
          break;
        }

        case 'showLeaveHistory': {
          action = 'NAVIGATE';
          path = '/leaves';
          toolResult = { success: true, message: 'Showing leave history' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to leave history via AI voice command'
          });
          details = 'Navigated to leave history logs';
          break;
        }

        case 'showPendingRequests': {
          if (user.role !== 'Admin') {
            throw new Error('Unauthorized: Only administrators can view pending requests.');
          }
          action = 'NAVIGATE';
          path = '/leaves';
          toolResult = { success: true, message: 'Showing pending leave requests' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to pending requests page via AI voice command'
          });
          details = 'Navigated to pending requests';
          break;
        }

        case 'navigateDashboard': {
          action = 'NAVIGATE';
          path = '/';
          toolResult = { success: true, message: 'Opening dashboard' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to dashboard via AI voice command'
          });
          details = 'Navigated to dashboard';
          break;
        }

        case 'navigateProfile': {
          action = 'NAVIGATE';
          path = '/profile';
          toolResult = { success: true, message: 'Opening profile' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to profile via AI voice command'
          });
          details = 'Navigated to profile';
          break;
        }

        case 'navigateNotifications': {
          action = 'NAVIGATE';
          path = '/notifications';
          toolResult = { success: true, message: 'Opening notifications' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to notifications via AI voice command'
          });
          details = 'Navigated to notifications';
          break;
        }

        case 'navigateSettings': {
          action = 'NAVIGATE';
          path = '/settings';
          toolResult = { success: true, message: 'Opening settings' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to settings via AI voice command'
          });
          details = 'Navigated to settings';
          break;
        }

        case 'navigateEmployees': {
          if (user.role !== 'Admin') {
            throw new Error('Unauthorized: Only administrators can access employee management.');
          }
          action = 'NAVIGATE';
          path = '/employees';
          toolResult = { success: true, message: 'Opening employee directory' };
          await AuditLog.create({
            action: 'AI Navigation Action',
            performedBy: user.id,
            details: 'Navigated to employee directory via AI voice command'
          });
          details = 'Navigated to employee directory';
          break;
        }

        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (err) {
      status = 'Failed';
      details = `Error in ${functionName}: ${err.message}`;
      toolResult = { success: false, message: err.message };
    }

    // Save interaction log to Database
    await AIInteractionLog.create({
      userId: user.id,
      command,
      detectedIntent: intent,
      aiInterpretation: JSON.stringify(functionArgs),
      actionExecuted: functionName,
      status: status === 'Success' ? 'Success' : 'Failed'
    });

    // Send tool result back to OpenAI for a natural final conversational turn
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...messages,
        responseMessage,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        }
      ]
    });

    const finalMessage = secondResponse.choices[0].message.content;

    return {
      success: status === 'Success',
      intent,
      speechResponse: finalMessage,
      action,
      path,
      history: [
        ...history,
        { role: 'user', content: command },
        { role: 'assistant', content: finalMessage }
      ],
      leaveType: functionArgs.leaveType || null,
      startDate: functionArgs.startDate || null,
      endDate: functionArgs.endDate || null,
      reason: functionArgs.reason || null
    };

  } else {
    // Normal text message (no tool calls, e.g. clarification or casual chit-chat)
    const textReply = responseMessage.content;
    const isClarification = textReply.includes('?') || textReply.toLowerCase().includes('please clarify') || textReply.toLowerCase().includes('what') || textReply.toLowerCase().includes('which');

    await AIInteractionLog.create({
      userId: user.id,
      command,
      detectedIntent: 'CLARIFICATION_OR_CONVERSATION',
      aiInterpretation: textReply,
      actionExecuted: 'none',
      status: isClarification ? 'Pending Clarification' : 'Success'
    });

    return {
      success: true,
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
  }
};
