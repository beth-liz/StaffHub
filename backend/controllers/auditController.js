import AuditLog from '../models/AuditLog.js';

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin only)
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, page = 1, limit = 20 } = req.query;

    const query = {};
    if (action) {
      query.action = new RegExp(action, 'i');
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort('-timestamp')
        .skip(skip)
        .limit(limitNum)
        .populate('performedBy', 'firstName lastName name employeeId email')
        .populate('targetUser', 'firstName lastName name employeeId email'),
      AuditLog.countDocuments(query),
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
