import { Router, Request, Response } from 'express';
import {
  getDevice,
  getAllDevices,
  registerOrUpdateDevice,
  pairDeviceAsset,
  getProtectedAssets,
  getProtectedAssetById,
  updateAssetArmStatus,
  getLatestTelemetry,
  getTelemetryHistory,
  getGPSRouteHistory,
  getSecurityEvents,
  getEvents,
  clearEvents,
  getDeviceSettings,
  updateDeviceSettings,
  updateAreaSecurityState,
  updateBelongingSecurityState,
  updateDeviceArmedStatus,
  recordSecurityEvent,
  logEvent
} from '../database/db.js';
import { publishCommand } from '../mqtt/client.js';
import { emitDeviceStatus, emitCommandAck, emitAssetUpdate } from '../websocket/socket.js';

export const deviceRouter = Router();

// ============================================================================
// REAL ASSET & DEVICE PAIRING
// ============================================================================
deviceRouter.post('/pair', (req: Request, res: Response): any => {
  try {
    const { device_id, device_uid, user_id, asset_name, asset_type, protection_mode } = req.body;
    const targetUid = String(device_uid || device_id || 'ESP32-SECURITY-001');
    const targetUser = String(user_id || 'usr_muskan');
    const targetAsset = String(asset_name || 'My Laptop');

    const asset = pairDeviceAsset({
      user_id: targetUser,
      device_id: targetUid,
      asset_name: targetAsset,
      asset_type: asset_type || 'LAPTOP',
      protection_mode: protection_mode || 'PERSONAL_BELONGING'
    });

    const device = getDevice(targetUid);

    recordSecurityEvent({
      id: `evt_pair_${Date.now()}`,
      device_id: targetUid,
      asset_id: asset.id,
      user_id: targetUser,
      event_type: 'DEVICE_ONLINE',
      title: `Device Paired: ${targetUid}`,
      message: `Paired with protected asset [${targetAsset}].`,
      severity: 'INFO',
      alarm_status: 'IDLE',
      created_at: new Date().toISOString()
    });

    emitAssetUpdate(asset);

    return res.status(200).json({ success: true, asset, device });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Register device (legacy alias)
deviceRouter.post('/register', (req: Request, res: Response): any => {
  try {
    const { device_id, device_uid, device_name, user_id, area_name, belonging_name } = req.body;
    const targetUid = String(device_uid || device_id || 'ESP32-SECURITY-001');

    const device = registerOrUpdateDevice({
      device_uid: targetUid,
      device_name: device_name ? String(device_name) : `Security Unit (${targetUid})`,
      user_id: user_id ? String(user_id) : 'usr_muskan'
    });

    if (area_name || belonging_name) {
      updateDeviceSettings(targetUid, {
        ...(area_name ? { area_name: String(area_name) } : {}),
        ...(belonging_name ? { belonging_name: String(belonging_name) } : {})
      });
    }

    if (belonging_name) {
      pairDeviceAsset({
        user_id: user_id ? String(user_id) : 'usr_muskan',
        device_id: targetUid,
        asset_name: String(belonging_name),
        asset_type: 'LAPTOP',
        protection_mode: 'PERSONAL_BELONGING'
      });
    }

    return res.status(200).json({ success: true, device });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PROTECTED ASSETS
// ============================================================================
deviceRouter.get('/assets', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  const assets = getProtectedAssets(userId);
  return res.json(assets);
});

deviceRouter.post('/assets/:id/arm', (req: Request, res: Response): any => {
  const assetId = req.params.id as string;
  const asset = updateAssetArmStatus(assetId, true);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Publish real MQTT ARM command
  publishCommand(asset.device_id, {
    command: 'ARM',
    params: { asset_id: asset.id, mode: asset.protection_mode },
  });

  emitDeviceStatus({ device_id: asset.device_id, is_armed: 1 });
  emitAssetUpdate(asset);

  recordSecurityEvent({
    id: `evt_arm_${Date.now()}`,
    device_id: asset.device_id,
    asset_id: asset.id,
    user_id: asset.user_id,
    event_type: 'ALARM_STARTED',
    title: `🛡️ Protection Armed: ${asset.asset_name}`,
    message: `Personal belonging protection armed. MPU6050 vibration tripwire active.`,
    severity: 'INFO',
    alarm_status: 'IDLE',
    created_at: new Date().toISOString()
  });

  return res.json({ success: true, asset });
});

deviceRouter.post('/assets/:id/disarm', (req: Request, res: Response): any => {
  const assetId = req.params.id as string;
  const asset = updateAssetArmStatus(assetId, false);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Publish real MQTT DISARM command
  publishCommand(asset.device_id, {
    command: 'DISARM',
    params: { asset_id: asset.id },
  });

  emitDeviceStatus({ device_id: asset.device_id, is_armed: 0 });
  emitAssetUpdate(asset);

  recordSecurityEvent({
    id: `evt_disarm_${Date.now()}`,
    device_id: asset.device_id,
    asset_id: asset.id,
    user_id: asset.user_id,
    event_type: 'ALARM_STOPPED',
    title: `Protection Disarmed: ${asset.asset_name}`,
    message: `Personal belonging protection disarmed for ${asset.asset_name}.`,
    severity: 'INFO',
    alarm_status: 'IDLE',
    created_at: new Date().toISOString()
  });

  return res.json({ success: true, asset });
});

// ============================================================================
// DEVICE STATUS & TELEMETRY
// ============================================================================
deviceRouter.get('/list', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  const devices = getAllDevices(userId);
  return res.json(devices);
});

deviceRouter.get('/:id/status', (req: Request, res: Response): any => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const device = getDevice(id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  const settings = getDeviceSettings(id);
  const latestTelemetry = getLatestTelemetry(id);
  const asset = getProtectedAssets().find(a => a.device_id === id);

  return res.json({
    device,
    settings,
    latestTelemetry,
    asset
  });
});

deviceRouter.get('/:id/telemetry', (req: Request, res: Response): any => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const telemetry = getLatestTelemetry(id);
  if (!telemetry) {
    return res.status(404).json({ error: 'No telemetry available for this device yet' });
  }
  return res.json(telemetry);
});

deviceRouter.get('/:id/telemetry/history', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const history = getTelemetryHistory(id, limit);
  return res.json(history);
});

deviceRouter.get('/:id/route', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const route = getGPSRouteHistory(id, limit);
  return res.json(route);
});

// Real Security Events
deviceRouter.get('/:id/events', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const userId = req.query.userId as string | undefined;
  const events = getSecurityEvents(id, userId, limit);
  return res.json(events);
});

deviceRouter.delete('/:id/events', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.query.userId as string | undefined;
  clearEvents(id, userId);
  return res.json({ success: true, message: 'Events cleared' });
});

deviceRouter.get('/:id/settings', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const settings = getDeviceSettings(id);
  return res.json(settings);
});

deviceRouter.put('/:id/settings', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updates = req.body;
  const updated = updateDeviceSettings(id, updates);

  if (updates.movement_threshold !== undefined) {
    publishCommand(id, {
      command: 'SET_CONFIG',
      params: { threshold: updates.movement_threshold },
    });
  }

  if (updates.silent_mode !== undefined) {
    publishCommand(id, {
      command: 'SET_CONFIG',
      params: { silent_mode: updates.silent_mode },
    });
  }

  return res.json(updated);
});

// ============================================================================
// HARDWARE COMMAND DISPATCH
// ============================================================================
deviceRouter.post('/:id/command', (req: Request, res: Response): any => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { command, params, userId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const targetUser = userId || 'usr_muskan';

    if (command === 'ARM' || command === 'ARM_PROTECTION' || command === 'BELONGING_SECURITY_ON') {
      updateBelongingSecurityState(id, true);
      emitDeviceStatus({ device_id: id, is_armed: 1 });
      publishCommand(id, { command: 'ARM', params: params || {} });
    } else if (command === 'DISARM' || command === 'DISARM_PROTECTION' || command === 'BELONGING_SECURITY_OFF') {
      updateBelongingSecurityState(id, false);
      emitDeviceStatus({ device_id: id, is_armed: 0 });
      publishCommand(id, { command: 'DISARM', params: params || {} });
    } else if (command === 'STOP_SIREN') {
      publishCommand(id, { command: 'STOP_SIREN', params: params || {} });
    } else if (command === 'REQUEST_STATUS') {
      publishCommand(id, { command: 'REQUEST_STATUS', params: params || {} });
    } else {
      publishCommand(id, { command, params: params || {} });
    }

    return res.status(200).json({
      success: true,
      message: `Command [${command}] published to ESP32 device ${id}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
