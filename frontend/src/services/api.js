import axios from 'axios';
import toast from 'react-hot-toast';

// Backend URL — set VITE_API_URL in frontend .env to override
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor ────────────────────────────────────────────────────
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

let lastNetworkErrorToast = 0;
const NETWORK_ERROR_COOLDOWN = 5000;

// ─── Response interceptor — normalise server errors ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with a non-2xx status
      const { status, data } = error.response;
      const message =
        data?.message ||
        data?.errors?.join(', ') ||
        `Request failed with status ${status}`;
      error.displayMessage = message;
      
      // Auto-logout on token expiration / unauthorized
      if (status === 401 && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Request was made but no response received (network error / server down)
      error.displayMessage =
        'Cannot reach the server. Make sure the backend is running.';
      error.isNetworkError = true;

      const now = Date.now();
      if (now - lastNetworkErrorToast > NETWORK_ERROR_COOLDOWN) {
        lastNetworkErrorToast = now;
        toast.error(error.displayMessage, { id: 'network-error-toast' });
      }
    } else {
      error.displayMessage = error.message;
    }
    return Promise.reject(error);
  }
);

// ─── Auth API Services ──────────────────────────────────────────────────────
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

// ─── Employee CRUD ──────────────────────────────────────────────────────────
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

// ─── Avatar Upload ──────────────────────────────────────────────────────────
export const uploadAvatar = async (id, file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await api.post(`/employees/${id}/upload-avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ─── Export to Excel ────────────────────────────────────────────────────────
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

// ─── Dashboard Services ─────────────────────────────────────────────────────
export const getDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/employees/stats');
  return response.data;
};

// ─── Leave Management Services ──────────────────────────────────────────────
export const applyLeaveRequest = async (formData) => {
  const response = await api.post('/leaves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

// ─── Notification Services ──────────────────────────────────────────────────
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

// ─── Audit Log Services ─────────────────────────────────────────────────────
export const fetchAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export default api;
