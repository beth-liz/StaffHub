import express from 'express';
import { body } from 'express-validator';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getStats,
  exportEmployees,
  exportEmployeeLeaveReport,
  uploadAvatar,
} from '../controllers/employeeController.js';
import upload from '../middleware/upload.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Shared validation rules for create / update
const employeeValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),

  body('employeeId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required'),

  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),

  body('designation')
    .trim()
    .notEmpty()
    .withMessage('Designation is required'),
];

// All routes require authentication
router.use(protect);

// Stats route must be declared BEFORE :id so it is not treated as a mongo id
router.route('/stats').get(authorize('Admin'), getStats);

// Export route — must also precede :id routes
router.route('/export').get(authorize('Admin'), exportEmployees);

// Base CRUD
router
  .route('/')
  .get(authorize('Admin'), getEmployees)
  .post(authorize('Admin'), employeeValidationRules, createEmployee);

router
  .route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(authorize('Admin'), deleteEmployee);

router.route('/:id/leave-report').get(authorize('Admin'), exportEmployeeLeaveReport);

// Avatar upload — single file field named "avatar"
router.route('/:id/upload-avatar').post(
  upload.single('avatar'),
  uploadAvatar
);

export default router;
