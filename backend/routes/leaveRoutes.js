import express from 'express';
import {
  applyLeave,
  getLeaves,
  updateLeaveStatus,
  getLeaveBalance,
  exportLeaves,
} from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';
import uploadAttachment from '../middleware/uploadAttachment.js';

const router = express.Router();

// All routes require login
router.use(protect);

// Export route — must precede :id routes
router.route('/export').get(exportLeaves);

router
  .route('/')
  .post(uploadAttachment.single('attachment'), applyLeave)
  .get(getLeaves);

router.route('/balance').get(getLeaveBalance);

// Admin-only approval route
router.route('/:id/status').put(authorize('Admin'), updateLeaveStatus);

export default router;
