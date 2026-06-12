import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const sampleEmployees = [
  {
    employeeId: 'EMP-1000',
    firstName: 'Elizabeth',
    lastName: 'Admin',
    email: 'admin@staffhub.com',
    phone: '5551112222',
    role: 'Admin',
    password: 'Admin@1234',
    isTempPassword: false,
    department: 'Human Resources',
    designation: 'HR Manager',
    status: 'Active',
    dateOfJoining: new Date('2025-01-15'),
    gender: 'Female',
    maritalStatus: 'Married',
  },
  {
    employeeId: 'EMP-1001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '5551234567',
    role: 'Employee',
    password: 'Employee@1234',
    isTempPassword: false,
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    status: 'Active',
    dateOfJoining: new Date('2025-02-10'),
    gender: 'Male',
    maritalStatus: 'Single',
  },
  {
    employeeId: 'EMP-1002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    phone: '5552345678',
    role: 'Employee',
    password: 'Employee@1234',
    isTempPassword: false,
    department: 'Human Resources',
    designation: 'HR Coordinator',
    status: 'Active',
    dateOfJoining: new Date('2025-03-05'),
    gender: 'Female',
    maritalStatus: 'Married',
  },
  {
    employeeId: 'EMP-1003',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.j@company.com',
    phone: '5553456789',
    role: 'Employee',
    password: 'Employee@1234',
    isTempPassword: false,
    department: 'Engineering',
    designation: 'Frontend Developer',
    status: 'Active',
    dateOfJoining: new Date('2025-03-20'),
    gender: 'Male',
    maritalStatus: 'Single',
  },
  {
    employeeId: 'EMP-1004',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@company.com',
    phone: '5554567890',
    role: 'Employee',
    password: 'Employee@1234',
    isTempPassword: false,
    department: 'Marketing',
    designation: 'Marketing Manager',
    status: 'Active',
    dateOfJoining: new Date('2025-04-12'),
    gender: 'Female',
    maritalStatus: 'Divorced',
  },
  {
    employeeId: 'EMP-1005',
    firstName: 'Michael',
    lastName: 'Wilson',
    email: 'm.wilson@company.com',
    phone: '5555678901',
    role: 'Employee',
    password: 'Employee@1234',
    isTempPassword: true, // For testing the first login flow!
    department: 'Sales',
    designation: 'Account Executive',
    status: 'Active',
    dateOfJoining: new Date('2025-05-01'),
    gender: 'Male',
    maritalStatus: 'Married',
  },
];

const seedDatabase = async () => {
  try {
    const connUri = process.env.MONGO_URI || 'mongodb://localhost:27017/employee_management';
    console.log(`Connecting to MongoDB for seeding at: ${connUri}`);

    await mongoose.connect(connUri);
    console.log('MongoDB connection established.');

    // Clear all existing collections
    await Employee.deleteMany({});
    await LeaveBalance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Cleared all existing database entries.');

    // Seed Employees (this runs pre-save hooks so passwords are encrypted)
    const seededEmployees = [];
    for (const empData of sampleEmployees) {
      const emp = new Employee(empData);
      await emp.save();
      seededEmployees.push(emp);
    }
    console.log(`Seeded ${seededEmployees.length} employee records.`);

    // Initialize Leave Balances for all employees
    for (const emp of seededEmployees) {
      await LeaveBalance.create({ employeeId: emp._id });
    }
    console.log('Initialized leave balance records.');

    // Seed mock leave requests
    const admin = seededEmployees.find((e) => e.role === 'Admin');
    const john = seededEmployees.find((e) => e.employeeId === 'EMP-1001');
    const rob = seededEmployees.find((e) => e.employeeId === 'EMP-1003');
    const jane = seededEmployees.find((e) => e.employeeId === 'EMP-1002');

    if (admin && john && rob && jane) {
      // 1. Approved Leave for John
      const leave1 = await LeaveRequest.create({
        employeeId: john._id,
        employeeName: john.name,
        department: john.department,
        leaveType: 'Casual Leave',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-03'),
        totalDays: 3,
        reason: 'Annual family vacation',
        contactDuringLeave: '555-999-0000',
        handoverDetails: 'Covered by Rob',
        handoverPerson: 'Robert Johnson',
        status: 'Approved',
        adminRemarks: 'Approved. Enjoy your vacation!',
        approvedBy: admin._id,
        approvedAt: new Date(),
      });

      // Deduct approved leave from John's balance
      const johnBal = await LeaveBalance.findOne({ employeeId: john._id });
      johnBal.casualLeave -= 3;
      await johnBal.save();

      // 2. Pending Leave for Rob
      await LeaveRequest.create({
        employeeId: rob._id,
        employeeName: rob.name,
        department: rob.department,
        leaveType: 'Sick Leave',
        startDate: new Date('2026-06-18'),
        endDate: new Date('2026-06-19'),
        totalDays: 2,
        reason: 'Medical checkup and recovery',
        contactDuringLeave: '555-888-1111',
        handoverDetails: 'Urgent issues routed to engineering Slack channel',
        status: 'Pending',
      });

      // 3. Clarification Required for Jane
      await LeaveRequest.create({
        employeeId: jane._id,
        employeeName: jane.name,
        department: jane.department,
        leaveType: 'Earned Leave',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
        totalDays: 5,
        reason: 'Personal matters',
        status: 'Clarification Required',
        adminRemarks: 'Please provide more details on the handover plan during your absence.',
        approvedBy: admin._id,
        approvedAt: new Date(),
      });

      console.log('Seeded sample leave requests.');

      // Seed mock notifications
      await Notification.create([
        {
          recipient: john._id,
          title: 'Leave Request Approved',
          message: 'Your request for Casual Leave has been approved by HR.',
          type: 'Leave Approved',
        },
        {
          recipient: jane._id,
          title: 'Leave Clarification Required',
          message: 'HR has requested clarification on your Earned Leave request. Remarks: Please provide details on handover.',
          type: 'Leave Clarification Requested',
        },
      ]);
      console.log('Seeded sample notifications.');

      // Seed audit logs
      await AuditLog.create([
        {
          action: 'System Init',
          performedBy: admin._id,
          details: 'HRMS Database seeded with initial structures.',
        },
        {
          action: 'Leave Approved',
          performedBy: admin._id,
          targetUser: john._id,
          details: 'Approved Casual Leave of 3 days for John Doe',
        },
      ]);
      console.log('Seeded audit logs.');
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected. Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
