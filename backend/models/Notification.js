import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Recipient reference is required'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: [
        'Leave Approved',
        'Leave Rejected',
        'Leave Clarification Requested',
        'Profile Updated',
        'Password Changed',
        'New Leave Request',
      ],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
