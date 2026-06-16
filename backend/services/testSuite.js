/**
 * AI Voice Assistant — Automated Test Suite
 * Usage: npm run test:ai (from backend directory)
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { runOpenAIChat } from './openaiService.js';
import { clearSession, getHistory } from './aiSessionManager.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';

// ─── Formatting ───────────────────────────────────────────────────────────────
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Mock Users ───────────────────────────────────────────────────────────────
const mockEmployeeId = new mongoose.Types.ObjectId();
const mockAdminId = new mongoose.Types.ObjectId();

const MOCK_EMPLOYEE = {
  id: mockEmployeeId,
  name: 'Test Employee',
  role: 'Employee',
  department: 'Engineering',
  employeeId: 'EMP-T100'
};

const MOCK_ADMIN = {
  id: mockAdminId,
  name: 'Test Admin',
  role: 'Admin',
  department: 'HR',
  employeeId: 'ADM-T100'
};

// ─── Test Harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

const assert = (label, condition, hint = '') => {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${hint ? ` — ${hint}` : ''}`);
    failed++;
  }
};

const section = (title) => {
  console.log(`\n${BOLD}▶ ${title}${RESET}`);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

const runTests = async () => {
  console.log(`\n${'═'.repeat(52)}`);
  console.log(`  StaffHub HRMS v2 — AI Assistant Test Suite (Rewritten)`);
  console.log(`${'═'.repeat(52)}`);

  // Connect DB
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/employee_management');
    console.log(`${PASS} MongoDB connected\n`);
  } catch (err) {
    console.error(`${FAIL} MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  // Clear DB state for tests
  await Employee.deleteMany({ email: 'test.create@example.com' });
  await Employee.deleteMany({ email: 'test.emp@example.com' });
  await LeaveRequest.deleteMany({ employeeName: 'Test Employee' });

  // Insert mock employee into DB for search tests
  const testEmp = await Employee.findOneAndUpdate(
    { email: 'test.emp@example.com' },
    {
      _id: MOCK_EMPLOYEE.id,
      name: 'Test Employee',
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test.emp@example.com',
      phone: '1234567890',
      department: 'Engineering',
      designation: 'Developer',
      role: 'Employee',
      password: 'password',
      employeeId: 'EMP-T100'
    },
    { upsert: true, new: true }
  );

  // 1. Session Isolation Test
  section('1. Session Isolation & History');
  clearSession(MOCK_EMPLOYEE.id);
  clearSession(MOCK_ADMIN.id);
  
  await runOpenAIChat({ command: 'Hello, my name is Test Employee', user: MOCK_EMPLOYEE });
  const eHistory = getHistory(MOCK_EMPLOYEE.id);
  assert('Employee history has messages', eHistory.length === 2);
  
  const aHistory = getHistory(MOCK_ADMIN.id);
  assert('Admin history is completely separate (empty initially)', aHistory.length === 0);

  // 2. Navigation
  section('2. Complete Navigation Map');
  const navTests = [
    { cmd: 'Go to dashboard', expectedPath: '/' },
    { cmd: 'Open my profile', expectedPath: '/profile' },
    { cmd: 'Show notifications', expectedPath: '/notifications' }
  ];
  for (const t of navTests) {
    const res = await runOpenAIChat({ command: t.cmd, user: MOCK_EMPLOYEE });
    assert(`Navigation: ${t.cmd} -> ${t.expectedPath}`, res.action === 'NAVIGATE' && res.path === t.expectedPath);
  }

  // 3. Employee Permission Denied for Admin Tasks
  section('3. Role-Based Access Control');
  const resDenied = await runOpenAIChat({ command: 'Create a new employee named John', user: MOCK_EMPLOYEE });
  assert('Employee cannot create employee', 
    resDenied.speechResponse.toLowerCase().includes('permission') || 
    resDenied.speechResponse.toLowerCase().includes('not authorized') ||
    resDenied.speechResponse.toLowerCase().includes('cannot') ||
    resDenied.speechResponse.toLowerCase().includes('not able') ||
    resDenied.speechResponse.toLowerCase().includes('admin'));

  // 4. Admin - Create Employee
  section('4. Employee Creation (DB Verified)');
  const createCmd = 'Create employee Alice Smith, email test.create@example.com, phone 1234567890, department HR, designation Manager';
  const resCreate = await runOpenAIChat({ command: createCmd, user: MOCK_ADMIN });
  assert('Returns navigate to /employees', resCreate.action === 'NAVIGATE' && resCreate.path === '/employees');
  
  const createdEmp = await Employee.findOne({ email: 'test.create@example.com' });
  assert('Employee document created in DB', !!createdEmp);
  assert('Employee name matches', createdEmp && createdEmp.name === 'Alice Smith');

  // 5. Employee - Apply Leave
  section('5. Leave Application');
  const applyCmd = 'Apply for sick leave from tomorrow to next monday because I have a fever';
  const resApply = await runOpenAIChat({ command: applyCmd, user: MOCK_EMPLOYEE });
  assert('Returns navigate to /leaves', resApply.action === 'NAVIGATE' && resApply.path === '/leaves');
  
  const appliedReq = await LeaveRequest.findOne({ employeeId: MOCK_EMPLOYEE.id, status: 'Pending' });
  assert('LeaveRequest document created in DB', !!appliedReq);

  // 6. Admin - Reject Leave
  section('6. Leave Rejection');
  if (appliedReq) {
    const rejectCmd = `Reject leave for Test Employee`;
    const resReject = await runOpenAIChat({ command: rejectCmd, user: MOCK_ADMIN });
    assert('Returns navigate to /leaves after reject', resReject.action === 'NAVIGATE' && resReject.path === '/leaves');
    
    const verifiedReq = await LeaveRequest.findById(appliedReq._id);
    assert('Leave status updated to Rejected in DB', verifiedReq && verifiedReq.status === 'Rejected', `Status is ${verifiedReq?.status}`);
  } else {
    console.log(`  ${WARN} Skipping rejection test because leave wasn't applied`);
  }

  // 7. Admin - Excel Export
  section('7. Excel Export');
  const resExport = await runOpenAIChat({ command: 'Export employees to excel', user: MOCK_ADMIN });
  assert('Returns DOWNLOAD_EXCEL action', resExport.action === 'DOWNLOAD_EXCEL');

  // 8. Dark Mode
  section('8. Theme Toggling');
  const resTheme = await runOpenAIChat({ command: 'Enable dark mode', user: MOCK_EMPLOYEE });
  assert('Returns TOGGLE_DARK_MODE action', resTheme.action === 'TOGGLE_DARK_MODE');

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`${BOLD}Results${RESET}:`);
  console.log(`  ${PASS} Passed : ${passed}`);
  if (failed) console.log(`  ${FAIL} Failed : ${failed}`);
  console.log(`${'─'.repeat(52)}\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
