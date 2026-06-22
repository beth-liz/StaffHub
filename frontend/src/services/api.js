import axios from 'axios';
import toast from 'react-hot-toast';

// Backend URL — set VITE_API_URL in frontend .env to override
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor — attach JWT token ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Network error toast throttle (once per 5 seconds) ──────────────────────
let lastNetworkErrorToast = 0;
const NETWORK_ERROR_COOLDOWN = 5000;

// ─── Response interceptor — normalise errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server replied with a non-2xx status
      const { status, data } = error.response;
      error.displayMessage =
        data?.message ||
        data?.errors?.join(', ') ||
        `Request failed with status ${status}`;

      // Auto-logout on token expiry / invalid token
      if (status === 401 && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // No response received — server down or network issue
      error.displayMessage = 'Cannot reach the server. Make sure the backend is running.';
      error.isNetworkError = true;

      const now = Date.now();
      if (now - lastNetworkErrorToast > NETWORK_ERROR_COOLDOWN) {
        lastNetworkErrorToast = now;
        toast.error(error.displayMessage, { id: 'network-error-toast', duration: 4000 });
      }
    } else {
      error.displayMessage = error.message;
    }

    return Promise.reject(error);
  }
);

// ─── Retry helper with exponential backoff ────────────────────────────────────
// Retries a function up to `maxAttempts` times with increasing delays.
// Delays: 1s → 3s → 5s before giving up and propagating the error.
const RETRY_DELAYS = [1000, 3000, 5000];

const withRetry = async (fn, maxAttempts = 3) => {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Only retry on genuine network errors, not 4xx/5xx responses
      if (!err.isNetworkError) throw err;

      const delay = RETRY_DELAYS[attempt];
      if (delay && attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// ─── Auth API Services ────────────────────────────────────────────────────────
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const setupFirstLogin = async (data) => {
  const response = await api.post('/auth/first-login', data);
  return response.data;
};

export const fetchSecurityQuestion = async (identifier) => {
  const response = await api.get(`/auth/forgot-password-question/${identifier}`);
  return response.data;
};

export const resetForgotPassword = async (data) => {
  const response = await api.post('/auth/forgot-password-reset', data);
  return response.data;
};

export const changeUserPassword = async (passwords) => {
  const response = await api.post('/auth/change-password', passwords);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// ─── Employee CRUD ────────────────────────────────────────────────────────────
export const getEmployees = async (params = {}) => {
  const response = await api.get('/employees', { params });
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employeeData) => {
  const response = await api.post('/employees', employeeData);
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(`/employees/${id}`, employeeData);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

// ─── Avatar Upload ────────────────────────────────────────────────────────────
export const uploadAvatar = async (id, file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await api.post(`/employees/${id}/upload-avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ─── Export to Excel ──────────────────────────────────────────────────────────
export const exportEmployees = async (params = {}) => {
  const response = await api.get('/employees/export', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(
    new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'];
  const filename = disposition
    ? disposition.split('filename=')[1]?.replace(/"/g, '')
    : `employees-${Date.now()}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportLeaveReport = async (params = {}) => {
  const response = await api.get('/leaves/export', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(
    new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'];
  const filename = disposition
    ? disposition.split('filename=')[1]?.replace(/"/g, '')
    : `Leave_Report_${Date.now()}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ─── Dashboard Services ───────────────────────────────────────────────────────
export const getDashboardData = async () => {
  const response = await withRetry(() => api.get('/dashboard'));
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/employees/stats');
  return response.data;
};

// ─── Leave Management Services ────────────────────────────────────────────────
// IMPORTANT: Leave form is JSON-only (no file attachments in current schema).
// Previously this was incorrectly set to multipart/form-data which caused
// Multer to consume req.body before the controller could read fields.
export const applyLeaveRequest = async (formData) => {
  const response = await api.post('/leaves', formData); // JSON — no Content-Type override needed
  return response.data;
};

export const getLeaveHistory = async (params = {}) => {
  const response = await api.get('/leaves', { params });
  return response.data;
};

export const getLeaveBalance = async (employeeId = null) => {
  const params = employeeId ? { employeeId } : {};
  const response = await api.get('/leaves/balance', { params });
  return response.data;
};

export const updateLeaveStatus = async (id, statusData) => {
  const response = await api.put(`/leaves/${id}/status`, statusData);
  return response.data;
};

// ─── Notification Services ────────────────────────────────────────────────────
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// ─── Audit Log Services ───────────────────────────────────────────────────────
export const fetchAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

// ─── AI Assistant Services ────────────────────────────────────────────────────
export const fetchAILogs = async (params = {}) => {
  const response = await api.get('/ai/logs', { params });
  return response.data;
};
export const sendAICommand = async (command) => {
  try {
    const res = await api.post(
      '/ai/command',
      { command },
      // AI commands might take longer (e.g. LLM + DB ops), extend timeout slightly
      { timeout: 30000 }
    );
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

export const clearAISession = async () => {
  try {
    const res = await api.post('/ai/clear-session');
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

/**
 * Transcribe an audio Blob via OpenAI Whisper (server-side fallback).
 * @param {Blob}   blob      Raw audio blob from MediaRecorder
 * @param {string} mimeType  e.g. 'audio/webm;codecs=opus'
 */
export const transcribeAudio = async (blob, mimeType = 'audio/webm') => {
  try {
    const ext = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('wav') ? '.wav' : '.webm';
    const formData = new FormData();
    formData.append('audio', blob, `recording${ext}`);

    const res = await api.post('/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000, // Whisper can take a few seconds
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
