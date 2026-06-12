import express from 'express';
import {
  login,
  firstLoginSetup,
  getSecurityQuestion,
  forgotPasswordReset,
  changePassword,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/first-login', firstLoginSetup);
router.get('/forgot-password-question/:identifier', getSecurityQuestion);
router.post('/forgot-password-reset', forgotPasswordReset);

// Protected routes
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
