import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.js';

// Protect routes - JWT validation
export const protect = async (req, res, next) => {
  let token;

  // Check if header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await Employee.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        return next(new Error('User not found in system'));
      }

      if (req.user.status !== 'Active') {
        res.status(403);
        return next(new Error('Your account is inactive. Please contact HR.'));
      }

      next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      res.status(401);
      return next(new Error('Not authorized, token invalid or expired'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token provided'));
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`User role '${req.user?.role || 'Guest'}' is not authorized to access this route`)
      );
    }
    next();
  };
};
