import mongoose from 'mongoose';
import logger from './logger.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/employee_management';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// ─── Connection Event Monitoring ────────────────────────────────────────────
mongoose.connection.on('connected', () => {
  logger.info('[MONGO] Connected to MongoDB successfully');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('[MONGO] Disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  logger.info('[MONGO] Reconnected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error(`[MONGO] Connection error: ${err.message}`);
});

mongoose.connection.on('close', () => {
  logger.info('[MONGO] Connection closed');
});

mongoose.connection.on('timeout', () => {
  logger.warn('[MONGO] Connection timed out');
});

// ─── Connect with retry logic ────────────────────────────────────────────────
const connectDB = async (attempt = 1) => {
  try {
    logger.info(`[MONGO] Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})...`);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      // Let Mongoose manage its own connection pool (defaults are fine)
    });

    logger.info(`[MONGO] Connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error(`[MONGO] Connection attempt ${attempt} failed: ${error.message}`);

    if (attempt < MAX_RETRIES) {
      logger.info(`[MONGO] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }

    // After all retries, log clearly but do NOT call process.exit.
    // The server keeps running — individual requests will fail gracefully
    // until MongoDB comes back and Mongoose auto-reconnects.
    logger.error(
      '[MONGO] All connection attempts failed. Server will continue running and retry automatically when MongoDB becomes available.'
    );
  }
};

export default connectDB;
