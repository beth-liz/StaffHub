import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import AIInteractionLog from '../models/AIInteractionLog.js';
import { runOpenAIChat } from '../services/openaiService.js';
import { clearSession } from '../services/aiSessionManager.js';

// Lazy-initialise the OpenAI client (reuse backend key)
let _openai = null;
const getOpenAI = () => {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
};

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// @desc    Process a voice or text AI command
// @route   POST /api/ai/command
// @access  Private
export const handleAICommand = async (req, res, next) => {
  try {
    const { command } = req.body;

    if (!command || !command.trim()) {
      res.status(400);
      throw new Error('Please provide a command transcript string.');
    }

    console.log(`\n[AI Request] User: ${req.user.name} (${req.user.role})`);
    console.log(`[AI Request] Command: "${command.trim()}"`);

    // Call the service (Groq → local fallback)
    const result = await runOpenAIChat({
      command: command.trim(),
      user: req.user,
    });

    console.log(`[AI Response] Provider: ${result.provider || 'unknown'} | Intent: ${result.intent}`);
    console.log(`[AI Response] Speech: "${result.speechResponse}"`);
    if (result.action) {
      console.log(`[AI Response] Action: ${result.action} → ${result.path}`);
    }

    res.status(200).json(result);
  } catch (error) {
    // Never expose raw provider errors to the client
    console.error('[AI] handleAICommand error:', error.message);
    res.status(200).json({
      success: false,
      provider: 'error',
      intent: 'ERROR',
      speechResponse: "I'm temporarily unable to reach the AI service. Please try again in a moment.",
      action: null,
      path: null,
      listItems: null
    });
  }
};

// @desc    Transcribe audio blob via OpenAI Whisper
// @route   POST /api/ai/transcribe
// @access  Private
export const transcribeAudio = async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ success: false, message: 'No audio file provided.' });
  }

  try {
    const client = getOpenAI();

    // Determine original extension; fall back to .webm
    const ext = path.extname(req.file.originalname || 'audio.webm') || '.webm';
    const renamedPath = filePath + ext;
    fs.renameSync(filePath, renamedPath);

    console.log(`[Whisper] Transcribing file: ${renamedPath} (${req.file.size} bytes)`);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(renamedPath),
      model: 'whisper-1',
      language: 'en',
      // Prompt hints for Indian English vocabulary & HRMS domain
      prompt: 'StaffHub HR assistant. Indian English. Leave application, employee management, payroll, attendance.',
      response_format: 'json',
    });

    const transcript = transcription.text?.trim() || '';
    console.log(`[Whisper] Transcript: "${transcript}"`);

    // Clean up temp file
    try { fs.unlinkSync(renamedPath); } catch { /* ignore */ }

    if (!transcript) {
      return res.status(200).json({ success: false, transcript: '', message: 'No speech detected in audio.' });
    }

    return res.status(200).json({ success: true, transcript });

  } catch (err) {
    // Clean up on error
    try { if (filePath) fs.unlinkSync(filePath); } catch { /* ignore */ }
    console.error('[Whisper] Transcription failed:', err.message);
    return res.status(500).json({ success: false, message: 'Transcription failed. Please try again.' });
  }
};

// @desc    Clear server-side AI session history
// @route   POST /api/ai/clear-session
// @access  Private
export const clearAISession = async (req, res, next) => {
  try {
    clearSession(req.user.id);
    res.status(200).json({ success: true, message: 'AI session history cleared.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI interaction logs (Admin)
// @route   GET /api/ai/logs
// @access  Private (Admin only)
export const getAILogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AIInteractionLog.find(query)
        .sort('-timestamp')
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName name employeeId email')
        .lean(),
      AIInteractionLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    AI provider health check
// @route   GET /api/ai/health
// @access  Public
export const getAIHealth = async (_req, res) => {
  const hasKey = !!process.env.GROQ_API_KEY;

  if (hasKey) {
    // Quick connectivity check
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });

      return res.status(200).json({
        provider: 'groq',
        status: 'ready',
        model: GROQ_MODEL,
      });
    } catch (err) {
      console.warn('[AI Health] Groq ping failed:', err.message);
    }
  }

  return res.status(200).json({
    provider: 'fallback',
    status: 'ready',
    model: null,
    note: hasKey
      ? 'Groq key is set but the service is unreachable. Local fallback is active.'
      : 'GROQ_API_KEY is not configured. Running in local fallback mode only.'
  });
};
