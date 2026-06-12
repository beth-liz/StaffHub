import express from 'express';
import { handleAICommand, getAILogs } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply auth protection to all AI endpoints
router.use(protect);

// Endpoint for submitting assistant voice/text commands
router.post('/command', handleAICommand);

// Endpoint for administrators to fetch historical interaction logs
router.get('/logs', authorize('Admin'), getAILogs);

export default router;
