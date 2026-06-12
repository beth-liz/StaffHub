import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import logger from './config/logger.js';
import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import errorHandler from './middleware/errorHandler.js';

// ─── Load & Validate ENV ─────────────────────────────────────────────────────
dotenv.config();

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error(`[SERVER] Missing required environment variables: ${missingEnv.join(', ')}`);
  logger.error('[SERVER] Please check your .env file. Exiting.');
  process.exit(1);
}

if (!process.env.PORT || isNaN(Number(process.env.PORT))) {
  logger.warn('[SERVER] PORT is not set or invalid — defaulting to 5000');
}

// ─── Resolve __dirname (ESM) ─────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Rate limiting — raised to 300 req per 15 min to handle dashboard polling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health & Diagnostic Endpoints ───────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'StaffHub HRMS v2 API is running',
    version: '2.0.0',
    timestamp: new Date(),
  });
});

app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  const statusCode = dbState === 1 ? 200 : 503;

  res.status(statusCode).json({
    server: 'running',
    database: dbStatus,
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/status', (_req, res) => {
  const mem = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.status(200).json({
    server: 'running',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: `${Math.floor(process.uptime())}s`,
    uptimeSeconds: process.uptime(),
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
    },
    cpu: {
      user: `${(cpuUsage.user / 1000).toFixed(2)} ms`,
      system: `${(cpuUsage.system / 1000).toFixed(2)} ms`,
    },
    platform: os.platform(),
    hostname: os.hostname(),
    database: {
      state: mongoose.connection.readyState,
      host: mongoose.connection.host || 'not connected',
      name: mongoose.connection.name || 'n/a',
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/ai', aiRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handling Middleware (must be last) ─────────────────────────────────
app.use(errorHandler);

// ─── Start HTTP Server ────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
const httpServer = app.listen(PORT, () => {
  logger.info(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`[SERVER] ${signal} received — shutting down gracefully...`);

  httpServer.close(async () => {
    logger.info('[SERVER] HTTP server closed');
    try {
      await mongoose.connection.close();
      logger.info('[MONGO] Connection closed on shutdown');
    } catch (err) {
      logger.error(`[MONGO] Error closing connection: ${err.message}`);
    }
    process.exit(0);
  });

  // Force kill after 10 seconds if server is stuck
  setTimeout(() => {
    logger.error('[SERVER] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Process-Level Crash Guards ───────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`[SERVER] Uncaught Exception: ${err.message}`, { stack: err.stack });
  // Log but keep server alive for recoverable errors
  // Only exit for truly fatal situations
  if (err.code === 'ERR_DLOPEN_FAILED' || err.code === 'MODULE_NOT_FOUND') {
    logger.error('[SERVER] Fatal module error — exiting');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`[SERVER] Unhandled Promise Rejection at: ${promise}`);
  logger.error(`[SERVER] Reason: ${reason?.message || reason}`);
  // Do NOT crash the server on unhandled rejections — log and continue
});
