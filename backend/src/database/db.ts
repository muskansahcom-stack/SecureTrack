import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index.js';
import {
  Device,
  ProtectedAsset,
  SensorReading,
  SecurityEvent,
  DeviceSettings,
  Telemetry,
  Alert,
  EventLog,
  User,
  GPSPoint
} from '../types/index.js';

const dbDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(CONFIG.DB_PATH);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      device_uid TEXT UNIQUE NOT NULL,
      device_id TEXT,
      device_model TEXT DEFAULT 'ESP32 DevKit V1',
      device_name TEXT NOT NULL,
      user_id TEXT,
      status TEXT DEFAULT 'OFFLINE',
      is_online INTEGER DEFAULT 0,
      is_armed INTEGER DEFAULT 0,
      last_seen TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      firmware_version TEXT DEFAULT 'v1.0.0-PRO',
      wifi_rssi INTEGER DEFAULT 0,
      battery_level REAL DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS protected_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      asset_type TEXT DEFAULT 'LAPTOP',
      protection_mode TEXT DEFAULT 'PERSONAL_BELONGING',
      armed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      accelerometer_x REAL,
      accelerometer_y REAL,
      accelerometer_z REAL,
      gyro_x REAL,
      gyro_y REAL,
      gyro_z REAL,
      latitude REAL,
      longitude REAL,
      wifi_rssi INTEGER,
      battery REAL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_dev_time ON sensor_readings(device_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      asset_id TEXT,
      user_id TEXT,
      event_type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      severity TEXT DEFAULT 'HIGH',
      latitude REAL,
      longitude REAL,
      alarm_status TEXT DEFAULT 'ACTIVE',
      acknowledged INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_security_events_dev_time ON security_events(device_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS device_settings (
      device_id TEXT PRIMARY KEY,
      area_name TEXT DEFAULT 'Hostel Room',
      area_security_enabled INTEGER DEFAULT 0,
      belonging_name TEXT DEFAULT 'My Laptop',
      belonging_security_enabled INTEGER DEFAULT 0,
      movement_threshold REAL DEFAULT 0.30,
      pir_enabled INTEGER DEFAULT 1,
      mpu_enabled INTEGER DEFAULT 1,
      auto_buzzer INTEGER DEFAULT 1,
      silent_mode INTEGER DEFAULT 0,
      alarm_duration_sec INTEGER DEFAULT 15,
      notification_motion INTEGER DEFAULT 1,
      notification_intrusion INTEGER DEFAULT 1,
      notification_offline INTEGER DEFAULT 1,
      notification_gps INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      accel_x REAL,
      accel_y REAL,
      accel_z REAL,
      gyro_x REAL,
      gyro_y REAL,
      gyro_z REAL,
      magnitude REAL,
      pir_motion INTEGER,
      gps_lat REAL,
      gps_lng REAL,
      gps_valid INTEGER,
      gps_satellites INTEGER,
      buzzer_active INTEGER,
      system_armed INTEGER,
      free_heap INTEGER,
      wifi_rssi INTEGER,
      FOREIGN KEY (device_id) REFERENCES devices(device_uid) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_dev_time ON telemetry(device_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      user_id TEXT,
      security_mode TEXT DEFAULT 'SYSTEM',
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      latitude REAL,
      longitude REAL,
      acknowledged INTEGER DEFAULT 0,
      FOREIGN KEY (device_id) REFERENCES devices(device_uid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_logs (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      user_id TEXT,
      security_mode TEXT DEFAULT 'SYSTEM',
      event_type TEXT NOT NULL,
      sensor TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      data_payload TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(device_uid) ON DELETE CASCADE
    );
  `);

  // Safe migrations
  const migrations = [
    `ALTER TABLE devices ADD COLUMN device_uid TEXT;`,
    `ALTER TABLE devices ADD COLUMN device_model TEXT DEFAULT 'ESP32 DevKit V1';`,
    `ALTER TABLE devices ADD COLUMN status TEXT DEFAULT 'OFFLINE';`,
    `ALTER TABLE devices ADD COLUMN battery_level REAL DEFAULT 100;`,
    `UPDATE devices SET device_uid = device_id WHERE device_uid IS NULL;`,
    `ALTER TABLE security_events ADD COLUMN title TEXT;`,
    `ALTER TABLE security_events ADD COLUMN acknowledged INTEGER DEFAULT 0;`,
  ];

  for (const m of migrations) {
    try { db.exec(m); } catch (e) {}
  }

  // Seed default user
  const defaultUser = db.prepare('SELECT * FROM users WHERE email = ?').get('muskan@securebelong.com') as unknown as User | undefined;
  if (!defaultUser) {
    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_muskan', 'Muskan', 'muskan@securebelong.com', '9876543210', '$2a$10$w09ZkC294o06Y12.e6mN0uXk74eUj2/FhIq5WzHqYqVb8J5fB2mre', new Date().toISOString());
  }

  // Seed default device (strictly start with OFFLINE until real hardware connects)
  const defaultDev = db.prepare('SELECT * FROM devices WHERE device_uid = ? OR device_id = ?').get('ESP32-SECURITY-001', 'ESP32-SECURITY-001') as unknown as Device | undefined;
  if (!defaultDev) {
    db.prepare(`
      INSERT INTO devices (id, device_uid, device_id, device_model, device_name, user_id, status, is_online, is_armed, last_seen, firmware_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'dev_001',
      'ESP32-SECURITY-001',
      'ESP32-SECURITY-001',
      'ESP32 DevKit V1',
      'ESP32 Security Unit',
      'usr_muskan',
      'OFFLINE',
      0,
      0,
      new Date().toISOString(),
      'v1.0.0-PRO'
    );
  }

  // Seed default protected asset "My Laptop"
  const defaultAsset = db.prepare('SELECT * FROM protected_assets WHERE device_id = ?').get('ESP32-SECURITY-001') as unknown as ProtectedAsset | undefined;
  if (!defaultAsset) {
    db.prepare(`
      INSERT INTO protected_assets (id, user_id, device_id, asset_name, asset_type, protection_mode, armed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ast_laptop_001',
      'usr_muskan',
      'ESP32-SECURITY-001',
      'My Laptop',
      'LAPTOP',
      'PERSONAL_BELONGING',
      0,
      new Date().toISOString()
    );
  }

  // Seed device settings
  const defaultSettings = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get('ESP32-SECURITY-001');
  if (!defaultSettings) {
    db.prepare(`
      INSERT INTO device_settings (device_id, area_name, area_security_enabled, belonging_name, belonging_security_enabled, movement_threshold, pir_enabled, mpu_enabled, auto_buzzer, silent_mode, alarm_duration_sec)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ESP32-SECURITY-001', 'Hostel Room', 0, 'My Laptop', 0, 0.30, 1, 1, 1, 0, 15);
  }
}

// ----------------------------------------------------------------------------
// USER METHODS
// ----------------------------------------------------------------------------
export function findUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as unknown as User | undefined;
}

export function findUserByPhone(phone: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as unknown as User | undefined;
}

export function findUserByEmailOrPhone(identifier: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?').get(identifier, identifier) as unknown as User | undefined;
}

export function findUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as User | undefined;
}

export function createUser(user: { id: string; name: string; email: string; phone?: string; password_hash: string }): User {
  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, user.name, user.email, user.phone || null, user.password_hash, new Date().toISOString());
  return findUserById(user.id)!;
}

// ----------------------------------------------------------------------------
// REAL DEVICE METHODS
// ----------------------------------------------------------------------------
export function getDevice(deviceUid: string): Device | undefined {
  const row = db.prepare('SELECT * FROM devices WHERE device_uid = ? OR device_id = ?').get(deviceUid, deviceUid) as any;
  if (!row) return undefined;
  return {
    ...row,
    device_uid: row.device_uid || row.device_id,
    device_id: row.device_uid || row.device_id,
    is_online: row.status === 'ONLINE' ? 1 : 0,
  };
}

export function getAllDevices(userId?: string): Device[] {
  let rows: any[];
  if (userId) {
    rows = db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  } else {
    rows = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all() as any[];
  }
  return rows.map(row => ({
    ...row,
    device_uid: row.device_uid || row.device_id,
    device_id: row.device_uid || row.device_id,
    is_online: row.status === 'ONLINE' ? 1 : 0,
  }));
}

export function registerOrUpdateDevice(dev: {
  device_uid: string;
  device_model?: string;
  device_name?: string;
  user_id?: string;
  status?: string;
  firmware_version?: string;
  ip_address?: string;
  wifi_rssi?: number;
}): Device {
  const existing = getDevice(dev.device_uid);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE devices
      SET device_model = COALESCE(?, device_model),
          device_name = COALESCE(?, device_name),
          user_id = COALESCE(?, user_id),
          status = COALESCE(?, status),
          is_online = CASE WHEN COALESCE(?, status) = 'ONLINE' THEN 1 ELSE 0 END,
          last_seen = ?,
          ip_address = COALESCE(?, ip_address),
          firmware_version = COALESCE(?, firmware_version),
          wifi_rssi = COALESCE(?, wifi_rssi)
      WHERE device_uid = ? OR device_id = ?
    `).run(
      dev.device_model ?? null,
      dev.device_name ?? null,
      dev.user_id ?? null,
      dev.status ?? null,
      dev.status ?? null,
      now,
      dev.ip_address ?? null,
      dev.firmware_version ?? null,
      dev.wifi_rssi ?? null,
      dev.device_uid,
      dev.device_uid
    );
  } else {
    const id = `dev_${Date.now()}`;
    db.prepare(`
      INSERT INTO devices (id, device_uid, device_id, device_model, device_name, user_id, status, is_online, is_armed, last_seen, ip_address, firmware_version, wifi_rssi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      dev.device_uid,
      dev.device_uid,
      dev.device_model || 'ESP32 DevKit V1',
      dev.device_name || `Security Unit (${dev.device_uid})`,
      dev.user_id || 'usr_muskan',
      dev.status || 'OFFLINE',
      dev.status === 'ONLINE' ? 1 : 0,
      0,
      now,
      dev.ip_address || null,
      dev.firmware_version || 'v1.0.0-PRO',
      dev.wifi_rssi || 0
    );
  }

  return getDevice(dev.device_uid)!;
}

export function updateDeviceOnlineStatus(deviceUid: string, isOnline: boolean, ip?: string, rssi?: number, fw?: string): void {
  const status = isOnline ? 'ONLINE' : 'OFFLINE';
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE devices
    SET status = ?,
        is_online = ?,
        last_seen = ?,
        ip_address = COALESCE(?, ip_address),
        wifi_rssi = COALESCE(?, wifi_rssi),
        firmware_version = COALESCE(?, firmware_version)
    WHERE device_uid = ? OR device_id = ?
  `).run(
    status,
    isOnline ? 1 : 0,
    now,
    ip ?? null,
    rssi ?? null,
    fw ?? null,
    deviceUid,
    deviceUid
  );
}

export function updateDeviceArmedStatus(deviceUid: string, isArmed: boolean): void {
  db.prepare(`
    UPDATE devices
    SET is_armed = ?, last_seen = ?
    WHERE device_uid = ? OR device_id = ?
  `).run(
    isArmed ? 1 : 0,
    new Date().toISOString(),
    deviceUid,
    deviceUid
  );

  // Sync with protected assets associated with this device
  db.prepare(`
    UPDATE protected_assets
    SET armed = ?
    WHERE device_id = ?
  `).run(isArmed ? 1 : 0, deviceUid);
}

// ----------------------------------------------------------------------------
// PROTECTED ASSETS METHODS
// ----------------------------------------------------------------------------
export function pairDeviceAsset(params: {
  user_id: string;
  device_id: string;
  asset_name: string;
  asset_type?: string;
  protection_mode?: string;
}): ProtectedAsset {
  const now = new Date().toISOString();
  // Ensure device is registered and owned by user
  registerOrUpdateDevice({
    device_uid: params.device_id,
    user_id: params.user_id,
    device_name: `Security Unit (${params.asset_name})`
  });

  const existingAsset = db.prepare('SELECT * FROM protected_assets WHERE device_id = ?').get(params.device_id) as any;

  if (existingAsset) {
    db.prepare(`
      UPDATE protected_assets
      SET asset_name = ?,
          asset_type = COALESCE(?, asset_type),
          protection_mode = COALESCE(?, protection_mode),
          user_id = ?
      WHERE id = ?
    `).run(
      params.asset_name,
      params.asset_type || 'LAPTOP',
      params.protection_mode || 'PERSONAL_BELONGING',
      params.user_id,
      existingAsset.id
    );
    return getProtectedAssetById(existingAsset.id)!;
  } else {
    const id = `ast_${Date.now()}`;
    db.prepare(`
      INSERT INTO protected_assets (id, user_id, device_id, asset_name, asset_type, protection_mode, armed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.user_id,
      params.device_id,
      params.asset_name,
      params.asset_type || 'LAPTOP',
      params.protection_mode || 'PERSONAL_BELONGING',
      0,
      now
    );
    return getProtectedAssetById(id)!;
  }
}

export function getProtectedAssets(userId?: string): ProtectedAsset[] {
  if (userId) {
    return db.prepare('SELECT * FROM protected_assets WHERE user_id = ? ORDER BY created_at DESC').all(userId) as unknown as ProtectedAsset[];
  }
  return db.prepare('SELECT * FROM protected_assets ORDER BY created_at DESC').all() as unknown as ProtectedAsset[];
}

export function getProtectedAssetById(id: string): ProtectedAsset | undefined {
  return db.prepare('SELECT * FROM protected_assets WHERE id = ?').get(id) as unknown as ProtectedAsset | undefined;
}

export function getProtectedAssetByDeviceId(deviceId: string): ProtectedAsset | undefined {
  return db.prepare('SELECT * FROM protected_assets WHERE device_id = ?').get(deviceId) as unknown as ProtectedAsset | undefined;
}

export function updateAssetArmStatus(assetId: string, armed: boolean): ProtectedAsset | undefined {
  const asset = getProtectedAssetById(assetId);
  if (!asset) return undefined;

  db.prepare('UPDATE protected_assets SET armed = ? WHERE id = ?').run(armed ? 1 : 0, assetId);
  updateDeviceArmedStatus(asset.device_id, armed);
  return getProtectedAssetById(assetId);
}

// ----------------------------------------------------------------------------
// SENSOR READINGS & TELEMETRY METHODS
// ----------------------------------------------------------------------------
export function recordSensorReading(reading: SensorReading): void {
  const now = reading.timestamp || new Date().toISOString();
  db.prepare(`
    INSERT INTO sensor_readings (
      device_id, accelerometer_x, accelerometer_y, accelerometer_z,
      gyro_x, gyro_y, gyro_z, latitude, longitude, wifi_rssi, battery, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reading.device_id,
    reading.accelerometer_x,
    reading.accelerometer_y,
    reading.accelerometer_z,
    reading.gyro_x,
    reading.gyro_y,
    reading.gyro_z,
    reading.latitude,
    reading.longitude,
    reading.wifi_rssi,
    reading.battery,
    now
  );
}

export function recordTelemetry(t: Telemetry): void {
  const now = t.timestamp || new Date().toISOString();
  db.prepare(`
    INSERT INTO telemetry (
      device_id, timestamp, accel_x, accel_y, accel_z,
      gyro_x, gyro_y, gyro_z, magnitude, pir_motion,
      gps_lat, gps_lng, gps_valid, gps_satellites,
      buzzer_active, system_armed, free_heap, wifi_rssi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.device_id,
    now,
    t.mpu.accel_x,
    t.mpu.accel_y,
    t.mpu.accel_z,
    t.mpu.gyro_x,
    t.mpu.gyro_y,
    t.mpu.gyro_z,
    t.mpu.magnitude,
    t.pir.motion ? 1 : 0,
    t.gps.latitude,
    t.gps.longitude,
    t.gps.valid ? 1 : 0,
    t.gps.satellites,
    t.buzzer_active ? 1 : 0,
    t.system_armed ? 1 : 0,
    t.free_heap || 0,
    t.wifi_rssi || 0
  );

  // Also record in normalized sensor_readings table
  recordSensorReading({
    device_id: t.device_id,
    accelerometer_x: t.mpu.accel_x,
    accelerometer_y: t.mpu.accel_y,
    accelerometer_z: t.mpu.accel_z,
    gyro_x: t.mpu.gyro_x,
    gyro_y: t.mpu.gyro_y,
    gyro_z: t.mpu.gyro_z,
    latitude: t.gps.latitude,
    longitude: t.gps.longitude,
    wifi_rssi: t.wifi_rssi ?? null,
    battery: t.battery ?? null,
    timestamp: now,
  });

  // Update device last_seen and online status
  updateDeviceOnlineStatus(t.device_id, true, undefined, t.wifi_rssi);
}

export function getLatestTelemetry(deviceId: string): Telemetry | null {
  const row = db.prepare('SELECT * FROM telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(deviceId) as any;
  if (!row) return null;
  const settings = getDeviceSettings(deviceId);
  return {
    id: row.id,
    device_id: row.device_id,
    timestamp: row.timestamp,
    mpu: {
      accel_x: row.accel_x,
      accel_y: row.accel_y,
      accel_z: row.accel_z,
      gyro_x: row.gyro_x,
      gyro_y: row.gyro_y,
      gyro_z: row.gyro_z,
      magnitude: row.magnitude,
      motion_detected: row.magnitude > (settings.movement_threshold || 0.25)
    },
    pir: {
      motion: Boolean(row.pir_motion),
      raw_val: row.pir_motion
    },
    gps: {
      latitude: row.gps_lat,
      longitude: row.gps_lng,
      valid: Boolean(row.gps_valid),
      satellites: row.gps_satellites
    },
    buzzer_active: Boolean(row.buzzer_active),
    system_armed: Boolean(row.system_armed),
    area_security_enabled: settings.area_security_enabled === 1,
    belonging_security_enabled: settings.belonging_security_enabled === 1,
    free_heap: row.free_heap,
    wifi_rssi: row.wifi_rssi
  };
}

export function getGPSRouteHistory(deviceId: string, limit = 100): GPSPoint[] {
  const rows = db.prepare(`
    SELECT gps_lat as latitude, gps_lng as longitude, timestamp
    FROM telemetry
    WHERE device_id = ? AND gps_valid = 1 AND gps_lat IS NOT NULL AND gps_lng IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(deviceId, limit) as any[];

  return rows.reverse().map(r => ({
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    timestamp: r.timestamp
  }));
}

export function getTelemetryHistory(deviceId: string, limit = 50): Telemetry[] {
  const settings = getDeviceSettings(deviceId);
  const rows = db.prepare(`
    SELECT * FROM telemetry
    WHERE device_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(deviceId, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    device_id: row.device_id,
    timestamp: row.timestamp,
    mpu: {
      accel_x: row.accel_x || 0,
      accel_y: row.accel_y || 0,
      accel_z: row.accel_z || 0,
      gyro_x: row.gyro_x || 0,
      gyro_y: row.gyro_y || 0,
      gyro_z: row.gyro_z || 0,
      magnitude: row.magnitude || 0,
      motion_detected: Boolean(row.magnitude > (settings.movement_threshold || 0.25))
    },
    pir: {
      motion: Boolean(row.pir_motion),
      raw_val: row.pir_motion
    },
    gps: {
      latitude: row.gps_lat,
      longitude: row.gps_lng,
      valid: Boolean(row.gps_valid),
      satellites: row.gps_satellites
    },
    buzzer_active: Boolean(row.buzzer_active),
    system_armed: Boolean(row.system_armed),
    area_security_enabled: settings.area_security_enabled === 1,
    belonging_security_enabled: settings.belonging_security_enabled === 1,
    free_heap: row.free_heap,
    wifi_rssi: row.wifi_rssi,
    uptime_sec: row.uptime_sec
  }));
}

// ----------------------------------------------------------------------------
// SECURITY EVENTS & ALERTS METHODS
// ----------------------------------------------------------------------------
export function recordSecurityEvent(event: SecurityEvent): SecurityEvent {
  const now = event.created_at || new Date().toISOString();
  const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Find associated asset if not specified
  let assetId = event.asset_id;
  let userId = event.user_id;
  if (!assetId) {
    const asset = getProtectedAssetByDeviceId(event.device_id);
    if (asset) {
      assetId = asset.id;
      userId = userId || asset.user_id;
    }
  }

  db.prepare(`
    INSERT INTO security_events (
      id, device_id, asset_id, user_id, event_type, title, message,
      severity, latitude, longitude, alarm_status, acknowledged, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.device_id,
    assetId || null,
    userId || 'usr_muskan',
    event.event_type,
    event.title || event.event_type,
    event.message || '',
    event.severity || 'HIGH',
    event.latitude || null,
    event.longitude || null,
    event.alarm_status || 'ACTIVE',
    event.acknowledged || 0,
    now
  );

  // Sync with alerts table for backwards compatibility
  db.prepare(`
    INSERT INTO alerts (id, device_id, user_id, security_mode, alert_type, title, description, severity, timestamp, latitude, longitude, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.device_id,
    userId || 'usr_muskan',
    'BELONGING',
    event.event_type,
    event.title || `Security Event: ${event.event_type}`,
    event.message || '',
    event.severity || 'HIGH',
    now,
    event.latitude || null,
    event.longitude || null,
    event.acknowledged || 0
  );

  // Sync with event_logs table
  db.prepare(`
    INSERT INTO event_logs (id, device_id, user_id, security_mode, event_type, sensor, message, severity, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.device_id,
    userId || 'usr_muskan',
    'BELONGING',
    event.event_type,
    event.event_type.includes('PIR') ? 'PIR' : 'MPU6050',
    event.message || event.title || event.event_type,
    event.severity || 'HIGH',
    now
  );

  return {
    ...event,
    id,
    asset_id: assetId,
    user_id: userId,
    created_at: now
  };
}

export function getSecurityEvents(deviceId?: string, userId?: string, limit = 50): SecurityEvent[] {
  let query = 'SELECT * FROM security_events';
  const conditions: string[] = [];
  const params: any[] = [];

  if (deviceId) {
    conditions.push('device_id = ?');
    params.push(deviceId);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params) as unknown as SecurityEvent[];
}

export function createAlert(alert: Alert): Alert {
  return recordSecurityEvent({
    id: alert.id,
    device_id: alert.device_id,
    user_id: alert.user_id,
    asset_id: alert.asset_id,
    event_type: alert.alert_type,
    title: alert.title,
    message: alert.description,
    severity: alert.severity,
    latitude: alert.latitude,
    longitude: alert.longitude,
    alarm_status: 'ACTIVE',
    created_at: alert.timestamp,
    acknowledged: alert.acknowledged
  }) as unknown as Alert;
}

export function getAlerts(deviceId?: string, userId?: string, limit = 50): Alert[] {
  let query = 'SELECT * FROM alerts';
  const conditions: string[] = [];
  const params: any[] = [];

  if (deviceId) {
    conditions.push('device_id = ?');
    params.push(deviceId);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params) as unknown as Alert[];
}

export function acknowledgeAlert(alertId: string): void {
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(alertId);
  db.prepare('UPDATE security_events SET acknowledged = 1, alarm_status = "STOPPED" WHERE id = ?').run(alertId);
}

export function clearAlerts(deviceId?: string, userId?: string): void {
  if (deviceId && userId) {
    db.prepare('DELETE FROM alerts WHERE device_id = ? AND user_id = ?').run(deviceId, userId);
    db.prepare('DELETE FROM security_events WHERE device_id = ? AND user_id = ?').run(deviceId, userId);
  } else if (deviceId) {
    db.prepare('DELETE FROM alerts WHERE device_id = ?').run(deviceId);
    db.prepare('DELETE FROM security_events WHERE device_id = ?').run(deviceId);
  } else if (userId) {
    db.prepare('DELETE FROM alerts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM security_events WHERE user_id = ?').run(userId);
  } else {
    db.prepare('DELETE FROM alerts').run();
    db.prepare('DELETE FROM security_events').run();
  }
}

export function logEvent(event: EventLog): EventLog {
  recordSecurityEvent({
    id: event.id,
    device_id: event.device_id,
    user_id: event.user_id,
    event_type: event.event_type,
    title: event.message,
    message: event.message,
    severity: event.severity,
    alarm_status: 'IDLE',
    created_at: event.timestamp
  });
  return event;
}

export function getEvents(deviceId?: string, userId?: string, limit = 100, eventType?: string): EventLog[] {
  let query = 'SELECT * FROM event_logs';
  const params: any[] = [];
  const conditions: string[] = [];

  if (deviceId) {
    conditions.push('device_id = ?');
    params.push(deviceId);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (eventType && eventType !== 'ALL') {
    conditions.push('event_type = ?');
    params.push(eventType);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params) as unknown as EventLog[];
}

export function clearEvents(deviceId?: string, userId?: string): void {
  if (deviceId && userId) {
    db.prepare('DELETE FROM event_logs WHERE device_id = ? AND user_id = ?').run(deviceId, userId);
  } else if (deviceId) {
    db.prepare('DELETE FROM event_logs WHERE device_id = ?').run(deviceId);
  } else if (userId) {
    db.prepare('DELETE FROM event_logs WHERE user_id = ?').run(userId);
  } else {
    db.prepare('DELETE FROM event_logs').run();
  }
}

// ----------------------------------------------------------------------------
// SETTINGS METHODS
// ----------------------------------------------------------------------------
export function getDeviceSettings(deviceId: string): DeviceSettings {
  let settings = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get(deviceId) as unknown as DeviceSettings | undefined;
  if (!settings) {
    db.prepare(`
      INSERT OR IGNORE INTO device_settings (device_id, area_name, area_security_enabled, belonging_name, belonging_security_enabled, movement_threshold, pir_enabled, mpu_enabled, auto_buzzer, silent_mode, alarm_duration_sec)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceId, 'Hostel Room', 0, 'My Laptop', 0, 0.30, 1, 1, 1, 0, 15);
    settings = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get(deviceId) as unknown as DeviceSettings;
  }
  return settings;
}

export function updateDeviceSettings(deviceId: string, updates: Partial<DeviceSettings>): DeviceSettings {
  getDeviceSettings(deviceId);
  const fields = Object.keys(updates).filter(k => k !== 'device_id');
  if (fields.length > 0) {
    const setClause = fields.map(k => `${k} = ?`).join(', ');
    const values = fields.map(k => (updates as any)[k]);
    values.push(deviceId);
    db.prepare(`UPDATE device_settings SET ${setClause} WHERE device_id = ?`).run(...values);
  }
  return getDeviceSettings(deviceId);
}

export function updateAreaSecurityState(deviceId: string, enabled: boolean): DeviceSettings {
  db.prepare('UPDATE device_settings SET area_security_enabled = ? WHERE device_id = ?').run(
    enabled ? 1 : 0,
    deviceId
  );
  const settings = getDeviceSettings(deviceId);
  const isAnyArmed = settings.area_security_enabled === 1 || settings.belonging_security_enabled === 1;
  updateDeviceArmedStatus(deviceId, isAnyArmed);
  return settings;
}

export function updateBelongingSecurityState(deviceId: string, enabled: boolean): DeviceSettings {
  db.prepare('UPDATE device_settings SET belonging_security_enabled = ? WHERE device_id = ?').run(
    enabled ? 1 : 0,
    deviceId
  );
  const settings = getDeviceSettings(deviceId);
  const isAnyArmed = settings.area_security_enabled === 1 || settings.belonging_security_enabled === 1;
  updateDeviceArmedStatus(deviceId, isAnyArmed);
  return settings;
}
