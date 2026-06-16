import express from 'express';
import { handleAICommand, getAILogs, getAIHealth, clearAISession } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Public ──────────────────────────────────────────────────────────────────
// Health check — no authentication required
router.get('/health', getAIHealth);

// ── Authenticated routes ────────────────────────────────────────────────────
router.use(protect);

// Submit a voice/text command to the AI assistant
router.post('/command', handleAICommand);

// Clear server-side AI session history (used on logout or manual clear)
router.post('/clear-session', clearAISession);

// Admin: view AI interaction history
router.get('/logs', authorize('Admin'), getAILogs);

export default router;
