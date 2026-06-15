/**
 * AI Voice Assistant — Automated Test Suite
 * Usage: npm run test:ai (from backend directory)
 *
 * Tests the service layer directly without spawning an HTTP server.
 * Requires a valid GROQ_API_KEY and a running MongoDB instance.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

// ─── Colours for terminal output ──────────────────────────────────────────────
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Connect to DB ────────────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staffhub_hrms');
    console.log(`${PASS} MongoDB connected\n`);
  } catch (err) {
    console.error(`${FAIL} MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

// ─── Mock Users ───────────────────────────────────────────────────────────────
const MOCK_EMPLOYEE = {
  id: new mongoose.Types.ObjectId(),
  name: 'Test Employee',
  role: 'Employee',
  department: 'Engineering',
  employeeId: 'EMP-TEST-001'
};

const MOCK_ADMIN = {
  id: new mongoose.Types.ObjectId(),
  name: 'Test Admin',
  role: 'Admin',
  department: 'HR',
  employeeId: 'ADM-TEST-001'
};

// ─── Test Harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let skipped = 0;

const assert = (label, condition, hint = '') => {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${hint ? ` — ${hint}` : ''}`);
    failed++;
  }
};

const skip = (label, reason) => {
  console.log(`  ${WARN} SKIP: ${label} (${reason})`);
  skipped++;
};

const section = (title) => {
  console.log(`\n${BOLD}▶ ${title}${RESET}`);
};

// ─── Test Definitions ─────────────────────────────────────────────────────────

const testLeaveBalance = async (runOpenAIChat) => {
  section('Leave Balance Query');
  const result = await runOpenAIChat({
    command: 'What is my leave balance?',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Returns a result object', !!result);
  assert('Has a speech response', typeof result.speechResponse === 'string' && result.speechResponse.length > 0);
  assert('Speech is non-empty', result.speechResponse.trim().length > 0);
  assert('Uses Groq or fallback provider', ['groq', 'fallback'].includes(result.provider));
};

const testNavigationDashboard = async (runOpenAIChat) => {
  section('Navigation — Dashboard');
  const result = await runOpenAIChat({
    command: 'Take me to the dashboard',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has action', result.action === 'NAVIGATE', `got: ${result.action}`);
  assert('Path is /', result.path === '/', `got: ${result.path}`);
};

const testNavigationProfile = async (runOpenAIChat) => {
  section('Navigation — Profile');
  const result = await runOpenAIChat({
    command: 'Open my profile',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has action', result.action === 'NAVIGATE');
  assert('Path is /profile', result.path === '/profile');
};

const testNavigationNotifications = async (runOpenAIChat) => {
  section('Navigation — Notifications');
  const result = await runOpenAIChat({
    command: 'Show me my notifications',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has action', result.action === 'NAVIGATE');
  assert('Path is /notifications', result.path === '/notifications');
};

const testNavigationSettings = async (runOpenAIChat) => {
  section('Navigation — Settings');
  const result = await runOpenAIChat({
    command: 'Open settings',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has action', result.action === 'NAVIGATE');
  assert('Path is /settings', result.path === '/settings');
};

const testLeaveHistory = async (runOpenAIChat) => {
  section('Leave History Navigation');
  const result = await runOpenAIChat({
    command: 'Show my leave history',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has navigate action or speech', result.action === 'NAVIGATE' || result.speechResponse?.length > 0);
  if (result.action === 'NAVIGATE') {
    assert('Path is /leaves', result.path === '/leaves');
  }
};

const testApplyLeaveComplete = async (runOpenAIChat) => {
  section('Apply Leave — Complete Request (Date: next Monday → next Friday)');
  const today = new Date();
  const day = today.getDay();
  const daysToMonday = (8 - day) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToMonday);
  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);
  const fmt = d => d.toISOString().split('T')[0];

  const result = await runOpenAIChat({
    command: `Apply for casual leave from ${fmt(nextMonday)} to ${fmt(nextFriday)} for a family vacation`,
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has speech response', typeof result.speechResponse === 'string' && result.speechResponse.length > 0);
  // Result can be success or failure (e.g. insufficient balance) — either is a valid outcome
  assert('Has provider info', !!result.provider);
};

const testApplyLeaveIncomplete = async (runOpenAIChat) => {
  section('Apply Leave — Incomplete (slot filling / clarification expected)');
  const result = await runOpenAIChat({
    command: 'I want to apply for leave',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has speech response', typeof result.speechResponse === 'string' && result.speechResponse.length > 0);
  // Expect clarification — speech should contain a question mark or mention of dates/type
  const looksLikeClarification = result.speechResponse.includes('?') ||
    /type|date|reason|when/i.test(result.speechResponse);
  assert('Asks for more details', looksLikeClarification, `got: "${result.speechResponse}"`);
};

const testAdminOnlyRejectEmployeeAccess = async (runOpenAIChat) => {
  section('Admin Access Control — employee cannot reject leave');
  const result = await runOpenAIChat({
    command: 'Reject leave for John',
    history: [],
    user: MOCK_EMPLOYEE
  });
  assert('Has speech response', typeof result.speechResponse === 'string');
  const looksRefused = /unauthorized|only admin|not allowed|cannot|can't|not authorized|not an admin/i.test(result.speechResponse);
  assert('Refuses unauthorized action', looksRefused, `got: "${result.speechResponse}"`);
};

const testHealthEndpoint = async () => {
  section('GET /api/ai/health');
  try {
    // Dynamic import avoids importing before env is loaded
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
    if (!fetch) {
      skip('HTTP health check', 'node-fetch not available — install node-fetch to enable');
      return;
    }
    const port = process.env.PORT || 5000;
    const res = await fetch(`http://localhost:${port}/api/ai/health`);
    const body = await res.json();
    assert('Response is 200', res.status === 200);
    assert('Has provider field', typeof body.provider === 'string');
    assert('Has status field', typeof body.status === 'string');
  } catch (_) {
    skip('HTTP health check', 'Backend server not running on expected port');
  }
};

// ─── Main Runner ──────────────────────────────────────────────────────────────

const run = async () => {
  console.log(`\n${'═'.repeat(52)}`);
  console.log(`  StaffHub HRMS v2 — AI Assistant Test Suite`);
  console.log(`${'═'.repeat(52)}`);

  await connectDB();

  // Lazy-import after env is loaded
  const { runOpenAIChat } = await import('./openaiService.js');

  await testLeaveBalance(runOpenAIChat);
  await testNavigationDashboard(runOpenAIChat);
  await testNavigationProfile(runOpenAIChat);
  await testNavigationNotifications(runOpenAIChat);
  await testNavigationSettings(runOpenAIChat);
  await testLeaveHistory(runOpenAIChat);
  await testApplyLeaveComplete(runOpenAIChat);
  await testApplyLeaveIncomplete(runOpenAIChat);
  await testAdminOnlyRejectEmployeeAccess(runOpenAIChat);
  await testHealthEndpoint();

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`${BOLD}Results${RESET}:`);
  console.log(`  ${PASS} Passed : ${passed}`);
  if (failed) console.log(`  ${FAIL} Failed : ${failed}`);
  if (skipped) console.log(`  ${WARN} Skipped: ${skipped}`);
  console.log(`${'─'.repeat(52)}\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
