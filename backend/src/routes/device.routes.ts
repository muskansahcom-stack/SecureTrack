import { Router, Request, Response } from 'express';
import {
  getDevice,
  getAllDevices,
  upsertDevice,
  getLatestTelemetry,
  getTelemetryHistory,
  getGPSRouteHistory,
  getEvents,
  clearEvents,
  getDeviceSettings,
  updateDeviceSettings,
  updateAreaSecurityState,
  updateBelongingSecurityState,
  updateDeviceArmedStatus,
  logEvent
} from '../database/db.js';
import { publishCommand } from '../mqtt/client.js';
import { emitDeviceStatus, emitCommandAck } from '../websocket/socket.js';
import { DeviceCommand } from '../types/index.js';

export const deviceRouter = Router();

// Register or pair device
deviceRouter.post('/register', (req: Request, res: Response): any => {
  try {
    const { device_id, device_name, user_id, area_name, belonging_name } = req.body;
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const device = upsertDevice({
      device_id: String(device_id),
      device_name: device_name ? String(device_name) : `Device ${device_id}`,
      user_id: user_id ? String(user_id) : 'usr_muskan'
    });

    if (area_name || belonging_name) {
      updateDeviceSettings(String(device_id), {
        ...(area_name ? { area_name: String(area_name) } : {}),
        ...(belonging_name ? { belonging_name: String(belonging_name) } : {})
      });
    }

    logEvent({
      id: `evt_reg_${Date.now()}`,
      device_id: String(device_id),
      user_id: user_id ? String(user_id) : 'usr_muskan',
      security_mode: 'SYSTEM',
      event_type: 'DEVICE_REGISTERED',
      sensor: 'SYSTEM',
      message: `Device ${device_id} successfully paired with account.`,
      severity: 'INFO',
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ success: true, device });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List all devices for user
deviceRouter.get('/list', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  const devices = getAllDevices(userId);
  return res.json(devices);
});

// Get device status
deviceRouter.get('/:id/status', (req: Request, res: Response): any => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const device = getDevice(id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  const settings = getDeviceSettings(id);
  const latestTelemetry = getLatestTelemetry(id);

  return res.json({
    device,
    settings,
    latestTelemetry
  });
});

// Get latest telemetry
deviceRouter.get('/:id/telemetry', (req: Request, res: Response): any => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const telemetry = getLatestTelemetry(id);
  if (!telemetry) {
    return res.status(404).json({ error: 'No telemetry available for this device yet' });
  }
  return res.json(telemetry);
});

// Get telemetry history
deviceRouter.get('/:id/telemetry/history', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const history = getTelemetryHistory(id, limit);
  return res.json(history);
});

// Get GPS route history (breadcrumbs for live tracking)
deviceRouter.get('/:id/route', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const route = getGPSRouteHistory(id, limit);
  return res.json(route);
});

// Get event logs
deviceRouter.get('/:id/events', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const eventType = req.query.type as string | undefined;
  const userId = req.query.userId as string | undefined;
  const events = getEvents(id, userId, limit, eventType);
  return res.json(events);
});

// Clear events
deviceRouter.delete('/:id/events', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.query.userId as string | undefined;
  clearEvents(id, userId);
  return res.json({ success: true, message: 'Events cleared' });
});

// Get device settings
deviceRouter.get('/:id/settings', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const settings = getDeviceSettings(id);
  return res.json(settings);
});

// Update device settings
deviceRouter.put('/:id/settings', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updates = req.body;
  const updated = updateDeviceSettings(id, updates);

  // Forward settings changes to ESP32 over MQTT
  if (updates.movement_threshold !== undefined) {
    publishCommand(id, {
      command: 'SET_THRESHOLD',
      params: { threshold: updates.movement_threshold },
      timestamp: Date.now()
    });
  }

  if (updates.silent_mode !== undefined) {
    publishCommand(id, {
      command: 'SET_SILENT_MODE',
      params: { silent_mode: updates.silent_mode },
      timestamp: Date.now()
    });
  }

  if (updates.area_security_enabled !== undefined) {
    publishCommand(id, {
      command: updates.area_security_enabled ? 'AREA_SECURITY_ON' : 'AREA_SECURITY_OFF',
      timestamp: Date.now()
    });
  }

  if (updates.belonging_security_enabled !== undefined) {
    publishCommand(id, {
      command: updates.belonging_security_enabled ? 'BELONGING_SECURITY_ON' : 'BELONGING_SECURITY_OFF',
      timestamp: Date.now()
    });
  }

  logEvent({
    id: `evt_set_${Date.now()}`,
    device_id: id,
    user_id: updates.user_id || 'usr_muskan',
    security_mode: 'SYSTEM',
    event_type: 'SETTINGS_UPDATE',
    sensor: 'SYSTEM',
    message: `Security settings configured for ${id}`,
    severity: 'INFO',
    timestamp: new Date().toISOString()
  });

  return res.json(updated);
});

// Send command to ESP32
deviceRouter.post('/:id/command', (req: Request, res: Response): any => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { command, params, userId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const devCommand: DeviceCommand = {
      command,
      params: params || {},
      timestamp: Date.now(),
      sender: 'WEB_APP'
    };

    const targetUser = userId || 'usr_muskan';

    // 1. AREA SECURITY COMMANDS (HC-SR501 PIR)
    if (command === 'AREA_SECURITY_ON') {
      const updatedSettings = updateAreaSecurityState(id, true);
      emitDeviceStatus({ device_id: id, is_armed: 1 });
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'AREA',
        event_type: 'AREA_SECURITY_ARMED',
        sensor: 'PIR',
        message: `Area security armed for [${updatedSettings.area_name}]. PIR tripwire active.`,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    } else if (command === 'AREA_SECURITY_OFF') {
      const updatedSettings = updateAreaSecurityState(id, false);
      const isStillArmed = updatedSettings.belonging_security_enabled === 1;
      emitDeviceStatus({ device_id: id, is_armed: isStillArmed ? 1 : 0 });
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'AREA',
        event_type: 'AREA_SECURITY_DISARMED',
        sensor: 'PIR',
        message: `Area security disarmed for [${updatedSettings.area_name}].`,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    }

    // 2. PERSONAL BELONGING SECURITY COMMANDS (MPU6050)
    else if (command === 'BELONGING_SECURITY_ON') {
      const updatedSettings = updateBelongingSecurityState(id, true);
      emitDeviceStatus({ device_id: id, is_armed: 1 });
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'BELONGING',
        event_type: 'BELONGING_SECURITY_ARMED',
        sensor: 'MPU6050',
        message: `Personal belonging security armed for [${updatedSettings.belonging_name}]. MPU6050 vibration tripwire active.`,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    } else if (command === 'BELONGING_SECURITY_OFF') {
      const updatedSettings = updateBelongingSecurityState(id, false);
      const isStillArmed = updatedSettings.area_security_enabled === 1;
      emitDeviceStatus({ device_id: id, is_armed: isStillArmed ? 1 : 0 });
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'BELONGING',
        event_type: 'BELONGING_SECURITY_DISARMED',
        sensor: 'MPU6050',
        message: `Personal belonging security disarmed for [${updatedSettings.belonging_name}].`,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    }

    // 3. PHYSICAL ALARM BUZZER COMMANDS
    else if (command === 'BUZZER_OFF') {
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'SYSTEM',
        event_type: 'ALARM_STOPPED',
        sensor: 'BUZZER',
        message: 'Physical alarm stopped by user from mobile dashboard.',
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });
    } else if (command === 'BUZZER_ON') {
      logEvent({
        id: `evt_cmd_${Date.now()}`,
        device_id: id,
        user_id: targetUser,
        security_mode: 'SYSTEM',
        event_type: 'ALARM_TRIGGERED',
        sensor: 'BUZZER',
        message: 'Manual alarm siren sounding via mobile application.',
        severity: 'HIGH',
        timestamp: new Date().toISOString()
      });
    }

    // 4. LEGACY MASTER ARM / DISARM
    else if (command === 'ARM') {
      updateAreaSecurityState(id, true);
      updateBelongingSecurityState(id, true);
      emitDeviceStatus({ device_id: id, is_armed: 1 });
    } else if (command === 'DISARM') {
      updateAreaSecurityState(id, false);
      updateBelongingSecurityState(id, false);
      emitDeviceStatus({ device_id: id, is_armed: 0 });
    }

    // Dispatch to physical ESP32 over MQTT
    const published = publishCommand(id, devCommand);

    return res.json({
      success: true,
      published,
      command: devCommand,
      message: `Command '${command}' dispatched to ESP32 (${id})`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST Heartbeat endpoint for direct HTTP fallback
deviceRouter.post('/:id/heartbeat', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const now = new Date().toISOString();

  upsertDevice({
    device_id: id,
    is_online: 1,
    last_seen: now,
    wifi_rssi: req.body.wifi_rssi || 0
  });

  emitDeviceStatus({
    device_id: id,
    is_online: 1,
    last_seen: now
  });

  return res.json({ success: true, timestamp: now });
});
