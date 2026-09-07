import axios from 'axios';

// When running in browser on localhost:5173, direct to backend on port 5001 or use current origin
export const API_BASE_URL =
  window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:5001`
    : window.location.origin;

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('securebelong_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: (credentials: { email?: string; identifier?: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  register: (data: { name: string; email: string; phone?: string; password: string }) =>
    apiClient.post('/auth/register', data),
  getMe: () => apiClient.get('/auth/me'),

  // Device
  registerDevice: (data: { device_id: string; device_name?: string; user_id?: string; area_name?: string; belonging_name?: string }) =>
    apiClient.post('/device/register', data),
  getDeviceList: (userId?: string) => apiClient.get(`/device/list${userId ? `?userId=${userId}` : ''}`),
  getDeviceStatus: (deviceId: string) => apiClient.get(`/device/${deviceId}/status`),
  getLatestTelemetry: (deviceId: string) => apiClient.get(`/device/${deviceId}/telemetry`),
  getTelemetryHistory: (deviceId: string, limit = 50) =>
    apiClient.get(`/device/${deviceId}/telemetry/history?limit=${limit}`),
  getGPSRoute: (deviceId: string, limit = 100) =>
    apiClient.get(`/device/${deviceId}/route?limit=${limit}`),

  // Commands
  sendCommand: (deviceId: string, command: string, params?: Record<string, any>, userId?: string) =>
    apiClient.post(`/device/${deviceId}/command`, { command, params, userId }),

  // Settings
  getDeviceSettings: (deviceId: string) => apiClient.get(`/device/${deviceId}/settings`),
  updateDeviceSettings: (deviceId: string, settings: Record<string, any>) =>
    apiClient.put(`/device/${deviceId}/settings`, settings),

  // Events & Alerts
  getEvents: (deviceId: string, limit = 100, type?: string, userId?: string) =>
    apiClient.get(`/device/${deviceId}/events?limit=${limit}${type ? `&type=${type}` : ''}${userId ? `&userId=${userId}` : ''}`),
  clearEvents: (deviceId: string, userId?: string) => apiClient.delete(`/device/${deviceId}/events${userId ? `?userId=${userId}` : ''}`),
  getAlerts: (deviceId?: string, limit = 50, userId?: string) =>
    apiClient.get(`/alerts?limit=${limit}${deviceId ? `&deviceId=${deviceId}` : ''}${userId ? `&userId=${userId}` : ''}`),
  acknowledgeAlert: (alertId: string) => apiClient.post(`/alerts/${alertId}/ack`),
  clearAlerts: (deviceId?: string, userId?: string) =>
    apiClient.delete(`/alerts?${deviceId ? `deviceId=${deviceId}` : ''}${userId ? `&userId=${userId}` : ''}`),

  // Simulation & Test
  triggerSimulationAlert: (data: Record<string, any>) =>
    apiClient.post('/alerts/trigger-test', data),

  // Health
  getHealth: () => apiClient.get('/health'),
};
