import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      unique: true,
    },
    casualLeave: {
      type: Number,
      required: true,
      default: 12,
      min: [0, 'Leave balance cannot be negative'],
    },
    sickLeave: {
      type: Number,
      required: true,
      default: 10,
      min: [0, 'Leave balance cannot be negative'],
    },
    earnedLeave: {
      type: Number,
      required: true,
      default: 15,
      min: [0, 'Leave balance cannot be negative'],
    },
  },
  {
    timestamps: true,
    collection: 'leave_balances',
  }
);

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export default LeaveBalance;
