import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add Authorization header
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

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password });
export const register = (data) =>
  api.post('/auth/register', data);
export const getMe = () =>
  api.get('/auth/me');

// ─── Areas ────────────────────────────────────────────
export const getAreas = () =>
  api.get('/areas/');
export const getArea = (id) =>
  api.get(`/areas/${id}`);
export const createArea = (data) =>
  api.post('/areas/', data);
export const deleteArea = (id) =>
  api.delete(`/areas/${id}`);
export const getAreaViolations = (id) =>
  api.get(`/areas/${id}/violations`);
export const getAreaHistory = (id) =>
  api.get(`/areas/${id}/history`);

// ─── Detection ────────────────────────────────────────
export const runDetection = (formData) =>
  api.post('/detect/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
export const getAnnotatedImage = (urlOrFilename) => {
  // If it's already a full URL (Cloudinary), return as-is
  if (urlOrFilename && (urlOrFilename.startsWith('http://') || urlOrFilename.startsWith('https://'))) {
    return urlOrFilename;
  }
  // Otherwise, treat as a local API path
  return `/api/detect/image/${urlOrFilename}`;
};

// ─── Violations ───────────────────────────────────────
export const getViolations = (params) =>
  api.get('/violations/', { params });
export const getViolation = (id) =>
  api.get(`/violations/${id}`);
export const updateViolationStatus = (id, status) =>
  api.patch(`/violations/${id}/status`, { status });
export const deleteViolation = (id) =>
  api.delete(`/violations/${id}`);
export const updateViolationNotes = (id, notes) =>
  api.post(`/violations/${id}/notes`, { notes });
export const downloadReport = (id) =>
  api.get(`/violations/${id}/report`, { responseType: 'blob' });

// ─── Analytics ────────────────────────────────────────
export const getSummary = () =>
  api.get('/analytics/summary');
export const getByType = () =>
  api.get('/analytics/by-type');
export const getBySeverity = () =>
  api.get('/analytics/by-severity');
export const getDetectionSummary = () =>
  api.get('/analytics/detection-summary');
export const getStatusBreakdown = () =>
  api.get('/analytics/status-breakdown');
export const getGeoJSON = () =>
  api.get('/analytics/geojson');
export const getDashboardSummary = () =>
  api.get('/analytics/dashboard');

// ─── Alerts ───────────────────────────────────────────
export const getRecentAlerts = () =>
  api.get('/alerts/recent');
export const resendAlert = (id) =>
  api.post(`/alerts/${id}/resend`);

// ─── Monitoring ───────────────────────────────────────
export const getSchedulerStatus = () =>
  api.get('/monitoring/scheduler/status');
export const addScanJob = (area_id, interval_minutes) =>
  api.post('/monitoring/scheduler/add', { area_id, interval_minutes });
export const removeScanJob = (area_id) =>
  api.post('/monitoring/scheduler/remove', { area_id });
export const pauseScheduler = () =>
  api.post('/monitoring/scheduler/pause');
export const resumeScheduler = () =>
  api.post('/monitoring/scheduler/resume');
export const getGeeStatus = () =>
  api.get('/monitoring/gee/status');
export const initGee = (data) =>
  api.post('/monitoring/gee/init', data);
export const getSessions = (params) =>
  api.get('/monitoring/sessions', { params });

export default api;
