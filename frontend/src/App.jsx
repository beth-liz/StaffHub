import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Auth pages (full-screen, no sidebar)
import Login from './pages/Login';
import FirstLogin from './pages/FirstLogin';

// Protected pages
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './pages/EmployeeForm';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeProfile from './pages/EmployeeProfile';
import LeaveApplication from './pages/LeaveApplication';
import LeaveHistory from './pages/LeaveHistory';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import AICommandHistory from './pages/AICommandHistory';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* ── Public Routes (no sidebar) ── */}
              <Route path="/login" element={<Login />} />
              <Route path="/first-login" element={<FirstLogin />} />

              {/* ── Protected Routes (inside sidebar layout) ── */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Employee Directory — Admin only */}
              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <EmployeeList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/new"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <EmployeeForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/:id"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <EmployeeDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <EmployeeForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Leave Management */}
              <Route
                path="/leaves"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <LeaveHistory />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaves/apply"
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <MainLayout>
                      <LeaveApplication />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Employee self-service */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <EmployeeProfile />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Notifications */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Notifications />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Audit Logs — Admin only */}
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <AuditLogs />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* AI Command Logs — Admin only */}
              <Route
                path="/ai-history"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <AICommandHistory />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
