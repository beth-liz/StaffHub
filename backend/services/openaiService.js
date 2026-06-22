import OpenAI from 'openai';
import { getSession, addToHistory, getHistory } from './aiSessionManager.js';
import { getToolsForRole } from './aiToolDefs.js';
import { executeTool } from './aiToolExecutor.js';
import { runLocalIntentEngine } from './localIntentEngine.js';
import AIInteractionLog from '../models/AIInteractionLog.js';

// ─── Provider Configuration ───────────────────────────────────────────────────
const OPENAI_MODEL = 'gpt-4o-mini';

let openAiClient = null;

const getOpenAiClient = () => {
  if (!openAiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing. Please set it in backend/.env');
    }
    openAiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openAiClient;
};

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
export const runStartupDiagnostics = async () => {
  console.log('\n──────────────────────────────────────────');
  console.log('  AI Voice Assistant — Startup Diagnostics');
  console.log('──────────────────────────────────────────');

  if (!process.env.OPENAI_API_KEY) {
    console.warn('✗ OPENAI_API_KEY not found — AI will run in local fallback mode only');
    console.log('──────────────────────────────────────────\n');
    return;
  }

  console.log('✓ OPENAI_API_KEY loaded');

  try {
    const client = getOpenAiClient();
    // Lightweight connectivity check — send a minimal 1-token completion
    await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    });
    console.log('✓ OpenAI connectivity successful');
    console.log(`✓ Model available: ${OPENAI_MODEL}`);
    console.log('✓ AI Assistant ready (OpenAI mode)');
  } catch (err) {
    console.error(`✗ OpenAI connection failed: ${err.message}`);
    console.warn('  Falling back to local intent engine for all requests.');
  }

  console.log('──────────────────────────────────────────\n');
};

// ─── Tool Argument Safe Parser ────────────────────────────────────────────────
const safeParseArgs = (rawArgs) => {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object' && rawArgs !== null) return rawArgs;
  if (typeof rawArgs === 'string' && rawArgs.trim() === '') return {};
  try {
    const parsed = JSON.parse(rawArgs);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Attempt to salvage partial JSON from malformed LLM outputs
    try {
      const cleaned = rawArgs.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return JSON.parse(cleaned) || {};
    } catch {
      console.error('[AI] Failed to parse tool arguments:', rawArgs);
      return {};
    }
  }
};

// ─── Voice Pre-processor ──────────────────────────────────────────────────────
const normalizeVoiceCommand = (text) => {
  if (!text) return text;
  let n = text;

  // ── Email normalization ───────────────────────────────────────────────────
  // "philip at gmail dot com" → "philip@gmail.com"
  // "philip dot fernando at outlook dot com" → "philip.fernando@outlook.com"
  // Handle "at the rate" / "at the rate of" as @
  n = n.replace(/\bat the rate(?: of)?\b/gi, '@');
  n = n.replace(/\b at \b/gi, '@');
  n = n.replace(/\b dot \b/gi, '.');
  n = n.replace(/\b underscore \b/gi, '_');
  n = n.replace(/\b dash \b/gi, '-');
  // Fix spaces around @ and . in emails  (e.g. "philip @ gmail . com" → "philip@gmail.com")
  n = n.replace(/\s*@\s*/g, '@');
  // Only collapse spaces around dots that look like email domains (followed by com/in/org/etc.)
  n = n.replace(/\s*\.\s*(?=com|org|net|in|co|io|edu|gov)/gi, '.');

  // ── Phone number normalization ────────────────────────────────────────────
  // "998 844 4411" or "99884-44411" → digits run together if 10+ digits found
  // Only apply to strings that look like phone numbers (mostly digits with separators)
  n = n.replace(/\b(\d[\d\s\-]{8,}\d)\b/g, (match) => {
    const digits = match.replace(/\D/g, '');
    return digits.length >= 10 ? digits : match;
  });

  // ── Ordinal date normalization ────────────────────────────────────────────
  // "23rd of July" → "23 July", "1st of October" → "1 October"
  n = n.replace(/(\d+)(?:st|nd|rd|th)\s+(?:of\s+)?/gi, '$1 ');

  // ── Common speech-to-text artifacts ───────────────────────────────────────
  // "full stop" → ".", "comma" at end of phrase → ","
  n = n.replace(/\bfull stop\b/gi, '.');
  n = n.replace(/\bhyphen\b/gi, '-');

  return n.trim();
};

// ─── Main OpenAI Chat Entry Point ─────────────────────────────────────────────
export const runOpenAIChat = async ({ command, user }) => {

  const normalizedCommand = normalizeVoiceCommand(command);

  const userId = user.id.toString();
  // Server-side session history management
  getSession(userId); // ensure session exists
  addToHistory(userId, 'user', normalizedCommand);
  const currentHistory = getHistory(userId);

  // ── Phase 1: Try OpenAI ──────────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getOpenAiClient();

      const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const formattedTime = new Date().toLocaleTimeString();
      const todayISO = new Date().toISOString().split('T')[0];

      // ── System prompt — natural conversational AI assistant ────────────────
      const basePrompt = `You are Nova, a smart, friendly, and efficient voice-activated HR assistant.
Today is ${formattedDate}. ISO: ${todayISO}. Time: ${formattedTime}.
User: ${user.name} | Role: ${user.role} | Department: ${user.department} | ID: ${user.employeeId}.

═══ CORE BEHAVIOR ═══
You are a CONVERSATIONAL assistant, NOT a form-filler. Users speak naturally — extract ALL information from a SINGLE voice command whenever possible.

EXAMPLE INPUT: "Apply a sick leave from the 23rd of July to the 25th of July because I have a headache."
→ You MUST immediately call applyLeave with: leaveType="Sick Leave", startDate="2026-07-23", endDate="2026-07-25", reason="I have a headache"
DO NOT ask follow-up questions. DO NOT ask for confirmation. Just execute.

EXAMPLE INPUT: "Create a new employee called Philip Gregory. His email is philip@gmail.com. Phone is 9988444411. Department Sales. Designation Sales Manager."
→ You MUST immediately call createEmployee with all extracted fields.
DO NOT ask for confirmation. Just execute.

═══ WHEN TO ASK FOLLOW-UP QUESTIONS ═══
ONLY ask if genuinely required information is MISSING. Ask for ONE missing piece at a time in a natural, friendly way.

Example: User says "Apply for leave next Monday"
→ leaveType is missing, dates are resolved, reason is missing
→ Ask: "Sure, what type of leave would you like to apply for? And what's the reason?"
(Ask for ALL missing fields in ONE question, not one at a time.)

Example: User says "sick leave"  (in a follow-up turn)
→ You now have leaveType from this turn + dates from previous turn
→ Still missing: reason
→ Ask: "Got it. What's the reason for the leave?"

═══ DATE RESOLUTION ═══
Resolve ALL relative dates to YYYY-MM-DD based on today (${todayISO}):
- "tomorrow" → next day
- "day after tomorrow" → day after next
- "next Monday" → upcoming Monday
- "next week" → Monday to Friday of next week
- "23rd of July" → 2026-07-23
- "from Monday to Wednesday" → resolve both dates
- "for two days starting tomorrow" → tomorrow and day after
- If only ONE date is mentioned, use it for BOTH startDate and endDate.

═══ LEAVE APPLICATION RULES ═══
- Tool: applyLeave. Required: leaveType, startDate, endDate, reason.
- NEVER guess the leave type. If not specified, ask.
- Valid types: Casual Leave, Sick Leave, Earned Leave, Work From Home, Emergency Leave, Loss Of Pay.
- Map spoken words: "sick" → "Sick Leave", "casual" → "Casual Leave", "earned"/"vacation" → "Earned Leave", "work from home"/"wfh" → "Work From Home", "emergency" → "Emergency Leave".
- Execute IMMEDIATELY once all 4 fields are available (from current turn + conversation history).

═══ EMPLOYEE CREATION RULES ═══
- Tool: createEmployee. Required: firstName, lastName, email, phone, department, designation.
- Optional: role (default "Employee"), gender.
- If user gives full name like "Philip Gregory", split into firstName="Philip", lastName="Gregory".
- Phone must be exactly 10 digits. If user gives in parts across turns, merge them.
- Execute IMMEDIATELY once all required fields are available.

═══ MULTI-TURN MEMORY ═══
You MUST remember ALL information from previous turns in this conversation.
- If the user said "Create employee Philip Gregory" in turn 1 and "his email is philip@gmail.com" in turn 2, you have firstName, lastName, AND email.
- NEVER re-ask for information the user already provided.
- Build up the entity progressively across turns until all required fields are present.

═══ CONVERSATION TONE & PERSONALITY ═══
You must feel like a friendly HR colleague, not a robot or an API. Speak naturally, warmly, and politely.
- If the user asks "How are you?", respond naturally: "I'm doing well, thanks for asking. What can I help you with today?"
- If the user says "Thank you", respond: "You're welcome! Happy to help."
- If the user says "Good morning", respond: "Good morning! Hope you're having a great day. How can I help?"
- If the user asks for your name, introduce yourself: "Hi ${user.name}, I'm Nova. How can I help today?"

- Keep sentences short for TTS playback. Use natural phrasing and pauses.
- Avoid technical jargon, database terminology, or system phrases (e.g. do NOT say "leave approved successfully" or "employee created successfully").
- You may use a maximum of 0-1 emoji per response, ONLY during casual conversation (e.g., greetings). Do NOT use emojis for approvals, rejections, audit logs, or administrative actions.

═══ SPOKEN INPUT HANDLING ═══
Users speak — their input may contain speech artifacts:
- Emails: "philip at gmail dot com" = philip@gmail.com (already normalized by pre-processor)
- Phone: digits may have spaces ("998 844 4411" = 9988444411)
- Names: first word(s) after "named/called" are the name
- Departments: match closest: Engineering, HR, Finance, Marketing, Operations, Sales
- "because I have a headache" → reason = "I have a headache"
- "due to a family function" → reason = "a family function"
- "as I am not feeling well" → reason = "I am not feeling well"

═══ GENERAL RULES ═══
- Keep responses SHORT for TTS playback (1-2 sentences max).
- When tools succeed, state the outcome naturally. Don't say "navigating you" — the UI handles navigation automatically.
- On "cancel" → acknowledge and clear the current flow.
- On "log out" / "sign out" → say a brief goodbye and call performLogout.
- NEVER ask for confirmation before executing. The user's voice command IS the confirmation.`;

      const employeeSpecificRules = `\n\n═══ ROLE: EMPLOYEE ═══\nYou help ${user.name} with: applying for leave, checking leave balances, viewing leave history, navigating the portal, and managing notifications. You CANNOT manage other employees or approve/reject leaves.`;
      
      const adminSpecificRules = `\n\n═══ ROLE: ADMIN ═══\nYou help ${user.name} with full admin powers: managing employees (create, delete, search, view), approving/rejecting leaves, viewing audit logs, exporting data, plus all employee self-service features.`;

      const systemPrompt = basePrompt + (user.role === 'Admin' ? adminSpecificRules : employeeSpecificRules);

      // We only send the last few messages to the LLM to save tokens, but skip the very last one which is the current command
      const llmHistory = currentHistory.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...llmHistory,
        { role: 'user', content: normalizedCommand }
      ];

      const tools = getToolsForRole(user.role);

      console.log(`[AI] Detected Intent: Sending to OpenAI (${OPENAI_MODEL})`);

      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
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

        const { toolResult, action, path, status, intent, listItems } = await executeTool(
          functionName, functionArgs, user, command
        );

        // Send result back to OpenAI for a conversational final reply
        const secondResponse = await client.chat.completions.create({
          model: OPENAI_MODEL,
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

        // Add assistant response to history
        addToHistory(userId, 'assistant', finalMessage);

        return {
          success: status === 'Success',
          provider: 'openai',
          intent,
          speechResponse: finalMessage,
          action,
          path,
          listItems
        };
      }

      // ── Text conversation path (clarification / chit-chat) ─────────────────
      const textReply = responseMessage.content || "I didn't quite understand that. Could you rephrase?";
      const isClarification = textReply.includes('?');
      console.log(`[AI] Detected Intent: CONVERSATION`);
      console.log(`[AI] Speech Response: ${textReply}`);

      // Add assistant response to history
      addToHistory(userId, 'assistant', textReply);

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
        provider: 'openai',
        intent: 'CONVERSATION',
        speechResponse: textReply,
        action: null,
        path: null,
        listItems: null
      };

    } catch (openaiError) {
      console.error(`[AI] OpenAI request failed: ${openaiError.message}`);
      console.warn('[AI] Switching to local intent engine fallback...');
    }
  } else {
    console.warn('[AI] OPENAI_API_KEY not set — using local intent engine.');
  }

  // ── Phase 2: Local intent engine fallback ──────────────────────────────────
  try {
    const fallbackResult = await runLocalIntentEngine({ command, user });
    const fallbackPrefix = "I'm temporarily unable to reach the AI service. Switching to local processing. ";

    // History is managed inside runLocalIntentEngine as well for local intents
    return {
      ...fallbackResult,
      provider: 'fallback',
      speechResponse: fallbackPrefix + (fallbackResult.speechResponse || ''),
    };
  } catch (fallbackError) {
    console.error(`[AI] Local fallback also failed: ${fallbackError.message}`);
    const errorMsg = "I'm unable to process your request right now. Please try again shortly.";
    addToHistory(userId, 'assistant', errorMsg);
    
    return {
      success: false,
      provider: 'fallback',
      intent: 'ERROR',
      speechResponse: errorMsg,
      action: null,
      path: null,
      listItems: null
    };
  }
};
