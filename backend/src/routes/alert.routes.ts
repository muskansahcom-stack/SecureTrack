import { Router, Request, Response } from 'express';
import { getAlerts, acknowledgeAlert, clearAlerts, createAlert, logEvent } from '../database/db.js';
import { emitAlert } from '../websocket/socket.js';
import { Alert } from '../types/index.js';

export const alertRouter = Router();

// Get alerts (filtered by device and/or user)
alertRouter.get('/', (req: Request, res: Response) => {
  const devIdParam = req.query.deviceId;
  const deviceId = Array.isArray(devIdParam) ? String(devIdParam[0]) : (devIdParam ? String(devIdParam) : undefined);
  const userIdParam = req.query.userId;
  const userId = Array.isArray(userIdParam) ? String(userIdParam[0]) : (userIdParam ? String(userIdParam) : undefined);
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const alerts = getAlerts(deviceId, userId, limit);
  return res.json(alerts);
});

// Acknowledge alert
alertRouter.post('/:id/ack', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  acknowledgeAlert(id);
  return res.json({ success: true, message: 'Alert acknowledged' });
});

// Resolve alert
alertRouter.post('/:id/resolve', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  acknowledgeAlert(id);
  return res.json({ success: true, message: 'Alert marked as resolved' });
});

// Clear all alerts
alertRouter.delete('/', (req: Request, res: Response) => {
  const devIdParam = req.query.deviceId;
  const deviceId = Array.isArray(devIdParam) ? String(devIdParam[0]) : (devIdParam ? String(devIdParam) : undefined);
  const userIdParam = req.query.userId;
  const userId = Array.isArray(userIdParam) ? String(userIdParam[0]) : (userIdParam ? String(userIdParam) : undefined);
  clearAlerts(deviceId, userId);
  return res.json({ success: true, message: 'Alerts cleared' });
});

// Trigger test alert (Simulation Sandbox)
alertRouter.post('/trigger-test', (req: Request, res: Response) => {
  const { device_id, user_id, security_mode, alert_type, title, description, severity, latitude, longitude } = req.body;
  const isArea = alert_type === 'INTRUSION' || security_mode === 'AREA';
  const alert: Alert = {
    id: `alt_test_${Date.now()}`,
    device_id: device_id || 'ESP32-SECURITY-001',
    user_id: user_id || 'usr_muskan',
    security_mode: isArea ? 'AREA' : 'BELONGING',
    alert_type: alert_type || (isArea ? 'INTRUSION' : 'MOTION'),
    title: title || (isArea ? '🚨 Area Intrusion Detected' : '🚨 Personal Belonging Moved'),
    description: description || (isArea ? 'PIR sensor triggered area intrusion in protected perimeter.' : 'MPU6050 detected movement on protected personal belonging.'),
    severity: severity || (isArea ? 'CRITICAL' : 'HIGH'),
    timestamp: new Date().toISOString(),
    latitude: latitude || 28.6139,
    longitude: longitude || 77.2090,
    acknowledged: 0
  };

  createAlert(alert);
  emitAlert(alert);

  logEvent({
    id: `evt_sim_${Date.now()}`,
    device_id: alert.device_id,
    user_id: alert.user_id,
    security_mode: alert.security_mode,
    event_type: `TEST_${alert.alert_type}`,
    sensor: isArea ? 'PIR' : 'MPU6050',
    message: `[TEST MODE] ${alert.description}`,
    severity: alert.severity,
    timestamp: alert.timestamp
  });

  return res.json({ success: true, alert });
});
