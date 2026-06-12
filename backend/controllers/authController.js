import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Password complexity regex check
const validatePasswordComplexity = (password) => {
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]).{8,}$/;
  return passwordRegex.test(password);
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400);
      throw new Error('Please provide email/employee ID and password');
    }

    // Search by email or employeeId
    const employee = await Employee.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { employeeId: identifier.trim() },
      ],
    });

    if (!employee) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (employee.status !== 'Active') {
      res.status(403);
      throw new Error('Your account is inactive. Please contact HR.');
    }

    // Verify password
    const isMatch = await employee.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Check if it's a first-time login requiring password change
    if (employee.isTempPassword) {
      return res.status(200).json({
        success: true,
        isTempPassword: true,
        message: 'First login detected. Password reset and security question setup required.',
        employeeId: employee.employeeId,
        email: employee.email,
        id: employee._id,
      });
    }

    // Generate Token
    const token = generateToken(employee._id);

    // Audit Log
    await AuditLog.create({
      action: 'Employee Login',
      performedBy: employee._id,
      details: 'Employee logged in successfully',
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        profilePhoto: employee.profilePhoto,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    First Login Flow setup (force password change and security question)
// @route   POST /api/auth/first-login
// @access  Public
export const firstLoginSetup = async (req, res, next) => {
  try {
    const { identifier, tempPassword, newPassword, securityQuestion, securityAnswer } = req.body;

    if (!identifier || !tempPassword || !newPassword || !securityQuestion || !securityAnswer) {
      res.status(400);
      throw new Error('All fields are required');
    }

    const employee = await Employee.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { employeeId: identifier.trim() },
      ],
    });

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    // Check if temporary password matches
    const isMatch = await employee.matchPassword(tempPassword);
    if (!isMatch) {
      res.status(401);
      throw new Error('Incorrect temporary password');
    }

    // Validate password rules
    if (!validatePasswordComplexity(newPassword)) {
      res.status(400);
      throw new Error(
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }

    // Update fields
    employee.password = newPassword;
    employee.securityQuestion = securityQuestion.trim();
    employee.securityAnswer = securityAnswer.toLowerCase().trim();
    employee.isTempPassword = false;

    await employee.save();

    // Generate token
    const token = generateToken(employee._id);

    // Audit Log
    await AuditLog.create({
      action: 'First Login Setup Completed',
      performedBy: employee._id,
      details: 'Password change and security question configured on first login',
    });

    res.status(200).json({
      success: true,
      message: 'Account configured successfully',
      token,
      user: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        profilePhoto: employee.profilePhoto,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get security question for password reset
// @route   GET /api/auth/forgot-password-question/:identifier
// @access  Public
export const getSecurityQuestion = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    const employee = await Employee.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { employeeId: identifier.trim() },
      ],
    });

    if (!employee) {
      res.status(404);
      throw new Error('Employee record not found');
    }

    if (!employee.securityQuestion) {
      res.status(400);
      throw new Error('No security question has been set for this account. Please contact an Admin.');
    }

    res.status(200).json({
      success: true,
      securityQuestion: employee.securityQuestion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify security question & reset password
// @route   POST /api/auth/forgot-password-reset
// @access  Public
export const forgotPasswordReset = async (req, res, next) => {
  try {
    const { identifier, securityAnswer, newPassword } = req.body;

    if (!identifier || !securityAnswer || !newPassword) {
      res.status(400);
      throw new Error('All fields are required');
    }

    const employee = await Employee.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { employeeId: identifier.trim() },
      ],
    });

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    // Match security answer
    const isAnswerMatch = await employee.matchSecurityAnswer(securityAnswer);
    if (!isAnswerMatch) {
      res.status(400);
      throw new Error('Incorrect answer to security question');
    }

    // Validate password rules
    if (!validatePasswordComplexity(newPassword)) {
      res.status(400);
      throw new Error(
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }

    // Set new password
    employee.password = newPassword;
    employee.isTempPassword = false; // ensure they can log in directly now
    await employee.save();

    // Audit Log
    await AuditLog.create({
      action: 'Password Reset Via Security Question',
      performedBy: employee._id,
      details: 'Password was successfully reset using security question authentication',
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide current password and new password');
    }

    const employee = await Employee.findById(req.user.id);

    const isMatch = await employee.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Incorrect current password');
    }

    if (!validatePasswordComplexity(newPassword)) {
      res.status(400);
      throw new Error(
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }

    employee.password = newPassword;
    await employee.save();

    // Audit Log
    await AuditLog.create({
      action: 'Password Changed',
      performedBy: employee._id,
      details: 'Employee changed their password from settings',
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};
