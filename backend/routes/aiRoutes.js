import express from 'express';
import multer from 'multer';
import os from 'os';
import { handleAICommand, getAILogs, getAIHealth, clearAISession, transcribeAudio } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Multer: store audio upload in OS temp dir (deleted after transcription)
const audioUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'application/octet-stream'];
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/'));
  },
});

// ── Public ──────────────────────────────────────────────────────────────────
// Health check — no authentication required
router.get('/health', getAIHealth);

// ── Authenticated routes ────────────────────────────────────────────────────
router.use(protect);

// Submit a voice/text command to the AI assistant
router.post('/command', handleAICommand);

// Whisper audio transcription fallback
router.post('/transcribe', audioUpload.single('audio'), transcribeAudio);

// Clear server-side AI session history (used on logout or manual clear)
router.post('/clear-session', clearAISession);

// Admin: view AI interaction history
router.get('/logs', authorize('Admin'), getAILogs);

export default router;

