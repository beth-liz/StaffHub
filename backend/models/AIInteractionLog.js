import mongoose from 'mongoose';

const aiInteractionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'User reference is required'],
    },
    command: {
      type: String,
      required: [true, 'Command transcript is required'],
      trim: true,
    },
    detectedIntent: {
      type: String,
      required: [true, 'Detected intent is required'],
      trim: true,
    },
    aiInterpretation: {
      type: String,
      default: '',
      trim: true,
    },
    actionExecuted: {
      type: String,
      default: 'none',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Success', 'Failed', 'Pending Clarification'],
      required: [true, 'Execution status is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ai_interaction_logs',
  }
);

const AIInteractionLog = mongoose.model('AIInteractionLog', aiInteractionLogSchema);

export default AIInteractionLog;
