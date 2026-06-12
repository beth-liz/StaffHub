import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID cannot be empty'],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email cannot be empty'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number cannot be empty'],
      trim: true,
      match: [
        /^\d{10}$/,
        'Phone number must contain only numbers and be exactly 10 digits',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['Admin', 'Employee'],
      default: 'Employee',
    },
    department: {
      type: String,
      required: [true, 'Department cannot be empty'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation cannot be empty'],
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    emergencyContactName: {
      type: String,
      trim: true,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Resigned', 'Terminated'],
      default: 'Active',
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    securityQuestion: {
      type: String,
      default: null,
    },
    securityAnswer: {
      type: String,
      default: null,
    },
    isTempPassword: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'employees',
  }
);

// Virtual field avatarUrl for backward compatibility with frontend
employeeSchema.virtual('avatarUrl')
  .get(function () {
    return this.profilePhoto;
  })
  .set(function (value) {
    this.profilePhoto = value;
  });

// Configure JSON and Object output to include virtuals
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// Pre-save middleware to hash passwords/security answers and compute full name
employeeSchema.pre('save', async function (next) {
  // Compute name field for index search queries
  this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();

  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Hash security answer if modified and exists
  if (this.isModified('securityAnswer') && this.securityAnswer) {
    const salt = await bcrypt.genSalt(10);
    this.securityAnswer = await bcrypt.hash(this.securityAnswer, salt);
  }

  next();
});

// Compare password method
employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compare security answer method
employeeSchema.methods.matchSecurityAnswer = async function (enteredAnswer) {
  if (!this.securityAnswer || !enteredAnswer) return false;
  return await bcrypt.compare(enteredAnswer.toLowerCase().trim(), this.securityAnswer);
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
