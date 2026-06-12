import AIInteractionLog from '../models/AIInteractionLog.js';
import { runOpenAIChat } from '../services/openaiService.js';

// @desc    Process a voice or text command using AI assistant
// @route   POST /api/ai/command
// @access  Private
export const handleAICommand = async (req, res, next) => {
  try {
    const { command, history } = req.body;

    if (!command || !command.trim()) {
      res.status(400);
      throw new Error('Please provide a command transcript string.');
    }

    // Call OpenAI service to parse, execute tools, and generate response
    const result = await runOpenAIChat({
      command: command.trim(),
      history: history || [],
      user: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI interaction logs for analytics
// @route   GET /api/ai/logs
// @access  Private (Admin only)
export const getAILogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

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
