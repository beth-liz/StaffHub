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

// ─── Main OpenAI Chat Entry Point ─────────────────────────────────────────────
export const runOpenAIChat = async ({ command, user }) => {

  const userId = user.id.toString();
  // Server-side session history management
  getSession(userId); // ensure session exists
  addToHistory(userId, 'user', command);
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

      // Role-based system prompt
      const basePrompt = `Current date: ${formattedDate}. Current time: ${formattedTime}. Today ISO: ${todayISO}.
Active user: Name: ${user.name}, Role: ${user.role}, Department: ${user.department}, Employee ID: ${user.employeeId}.

Rules:
1. Resolve relative dates ("tomorrow", "next Monday", "next week") to absolute YYYY-MM-DD based on today: ${todayISO}.
2. Keep responses short and natural for Text-to-Speech playback.
3. When a tool succeeds or fails, explain the outcome clearly.
4. Use provided tools whenever possible.

CRITICAL RULES:
5. For leave applications: immediately call 'applyLeave' once all 4 fields (leaveType, startDate, endDate, reason) are provided. Do NOT ask for confirmation. Do NOT review.
6. For employee creation: immediately call 'createEmployee' once all required details are provided. Do NOT ask for confirmation. Do NOT review.
7. NEVER auto-guess the leave type. If the user says "I want to take leave" without specifying the type, you MUST ask: "What type of leave would you like to apply for?" Do NOT default to any type.
8. If any required parameter is missing, ASK ONLY for the missing information. Do not ask for confirmation of the whole form.
9. When the user says "cancel", clear the current flow and acknowledge the cancellation.
10. When a user says "log me out", "logout", or "sign out", say a brief goodbye and call performLogout.`;

      const employeeSpecificRules = `\nYou are the AI Voice Assistant for StaffHub HRMS v2 for an Employee. You can help them apply for leave, check balances, and navigate the portal. You CANNOT manage other employees, approve/reject leaves, or view system logs.`;
      
      const adminSpecificRules = `\nYou are the AI Voice Assistant for StaffHub HRMS v2 for an Admin. You have full access to manage employees, approve/reject leaves, export data, and view system logs. You can also perform employee self-service actions.`;

      const systemPrompt = basePrompt + (user.role === 'Admin' ? adminSpecificRules : employeeSpecificRules);

      // We only send the last few messages to the LLM to save tokens, but skip the very last one which is the current command
      const llmHistory = currentHistory.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...llmHistory,
        { role: 'user', content: command }
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
