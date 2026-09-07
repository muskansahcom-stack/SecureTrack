import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index.js';
import { Device, DeviceSettings, Telemetry, Alert, EventLog, User, GPSPoint } from '../types/index.js';

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
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      user_id TEXT,
      is_online INTEGER DEFAULT 0,
      is_armed INTEGER DEFAULT 0,
      last_seen TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      firmware_version TEXT DEFAULT 'v1.0.0',
      wifi_rssi INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS device_settings (
      device_id TEXT PRIMARY KEY,
      area_name TEXT DEFAULT 'My Hostel Room',
      area_security_enabled INTEGER DEFAULT 0,
      belonging_name TEXT DEFAULT 'My Laptop Bag',
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
      notification_gps INTEGER DEFAULT 1,
      FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
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
      FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
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
      FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_dev_time ON alerts(device_id, timestamp DESC);

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
      FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_dev_time ON event_logs(device_id, timestamp DESC);
  `);

  // Safe migrations for existing database files
  const migrations = [
    `ALTER TABLE users ADD COLUMN phone TEXT;`,
    `ALTER TABLE device_settings ADD COLUMN area_name TEXT DEFAULT 'My Hostel Room';`,
    `ALTER TABLE device_settings ADD COLUMN area_security_enabled INTEGER DEFAULT 0;`,
    `ALTER TABLE device_settings ADD COLUMN belonging_name TEXT DEFAULT 'My Laptop Bag';`,
    `ALTER TABLE device_settings ADD COLUMN belonging_security_enabled INTEGER DEFAULT 0;`,
    `ALTER TABLE device_settings ADD COLUMN silent_mode INTEGER DEFAULT 0;`,
    `ALTER TABLE alerts ADD COLUMN user_id TEXT;`,
    `ALTER TABLE alerts ADD COLUMN security_mode TEXT DEFAULT 'SYSTEM';`,
    `ALTER TABLE event_logs ADD COLUMN user_id TEXT;`,
    `ALTER TABLE event_logs ADD COLUMN security_mode TEXT DEFAULT 'SYSTEM';`,
  ];

  for (const m of migrations) {
    try { db.exec(m); } catch (e) {}
  }

  // Ensure default demo user exists for seamless out-of-the-box experience
  const defaultUser = db.prepare('SELECT * FROM users WHERE email = ?').get('muskan@securebelong.com') as unknown as User | undefined;
  if (!defaultUser) {
    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_muskan', 'Muskan', 'muskan@securebelong.com', '9876543210', '$2a$10$w09ZkC294o06Y12.e6mN0uXk74eUj2/FhIq5WzHqYqVb8J5fB2mre', new Date().toISOString());
  }

  // Ensure default device exists
  const defaultDev = db.prepare('SELECT * FROM devices WHERE device_id = ?').get('ESP32-SECURITY-001') as unknown as Device | undefined;
  if (!defaultDev) {
    db.prepare(`
      INSERT INTO devices (id, device_id, device_name, user_id, is_online, is_armed, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('dev_001', 'ESP32-SECURITY-001', 'My Security Device', 'usr_muskan', 0, 0, new Date().toISOString());

    db.prepare(`
      INSERT INTO device_settings (device_id, area_name, area_security_enabled, belonging_name, belonging_security_enabled, movement_threshold, pir_enabled, mpu_enabled, auto_buzzer, silent_mode, alarm_duration_sec)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ESP32-SECURITY-001', 'My Hostel Room', 0, 'My Laptop Bag', 0, 0.30, 1, 1, 1, 0, 15);

    logEvent({
      id: 'evt_init',
      device_id: 'ESP32-SECURITY-001',
      user_id: 'usr_muskan',
      security_mode: 'SYSTEM',
      event_type: 'SYSTEM_STARTUP',
      sensor: 'SYSTEM',
      message: 'SECUREBELONG Personal Security Platform initialized.',
      severity: 'INFO',
      timestamp: new Date().toISOString()
    });
  }
}

// User methods
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

// Device methods
export function getDevice(deviceId: string): Device | undefined {
  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId) as unknown as Device | undefined;
}

export function getAllDevices(userId?: string): Device[] {
  if (userId) {
    return db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC').all(userId) as unknown as Device[];
  }
  return db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all() as unknown as Device[];
}

export function upsertDevice(device: Partial<Device> & { device_id: string }): Device {
  const existing = getDevice(device.device_id);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(`
      UPDATE devices
      SET device_name = COALESCE(?, device_name),
          user_id = COALESCE(?, user_id),
          is_online = COALESCE(?, is_online),
          is_armed = COALESCE(?, is_armed),
          last_seen = ?,
          ip_address = COALESCE(?, ip_address),
          firmware_version = COALESCE(?, firmware_version),
          wifi_rssi = COALESCE(?, wifi_rssi)
      WHERE device_id = ?
    `).run(
      device.device_name ?? null,
      device.user_id ?? null,
      device.is_online !== undefined ? device.is_online : null,
      device.is_armed !== undefined ? device.is_armed : null,
      now,
      device.ip_address ?? null,
      device.firmware_version ?? null,
      device.wifi_rssi ?? null,
      device.device_id
    );
  } else {
    const id = device.id || `dev_${Date.now()}`;
    db.prepare(`
      INSERT INTO devices (id, device_id, device_name, user_id, is_online, is_armed, last_seen, ip_address, firmware_version, wifi_rssi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      device.device_id,
      device.device_name || `Device ${device.device_id}`,
      device.user_id || 'usr_muskan',
      device.is_online || 0,
      device.is_armed || 0,
      now,
      device.ip_address || null,
      device.firmware_version || 'v1.0.0',
      device.wifi_rssi || 0
    );

    db.prepare(`
      INSERT OR IGNORE INTO device_settings (device_id, area_name, area_security_enabled, belonging_name, belonging_security_enabled, movement_threshold, pir_enabled, mpu_enabled, auto_buzzer, silent_mode, alarm_duration_sec)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(device.device_id, 'My Hostel Room', 0, 'My Laptop Bag', 0, 0.30, 1, 1, 1, 0, 15);
  }
  return getDevice(device.device_id)!;
}

export function updateDeviceArmedStatus(deviceId: string, isArmed: boolean): void {
  db.prepare('UPDATE devices SET is_armed = ?, last_seen = ? WHERE device_id = ?').run(
    isArmed ? 1 : 0,
    new Date().toISOString(),
    deviceId
  );
}

export function updateAreaSecurityState(deviceId: string, enabled: boolean): DeviceSettings {
  db.prepare('UPDATE device_settings SET area_security_enabled = ? WHERE device_id = ?').run(
    enabled ? 1 : 0,
    deviceId
  );
  // Also sync master is_armed if either area or belonging is enabled
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

export function updateDeviceOnlineStatus(deviceId: string, isOnline: boolean): void {
  db.prepare('UPDATE devices SET is_online = ?, last_seen = ? WHERE device_id = ?').run(
    isOnline ? 1 : 0,
    new Date().toISOString(),
    deviceId
  );
}

// Settings methods
export function getDeviceSettings(deviceId: string): DeviceSettings {
  let settings = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get(deviceId) as unknown as DeviceSettings | undefined;
  if (!settings) {
    db.prepare(`
      INSERT OR IGNORE INTO device_settings (device_id, area_name, area_security_enabled, belonging_name, belonging_security_enabled, movement_threshold, pir_enabled, mpu_enabled, auto_buzzer, silent_mode, alarm_duration_sec)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceId, 'My Hostel Room', 0, 'My Laptop Bag', 0, 0.30, 1, 1, 1, 0, 15);
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

// Telemetry methods
export function recordTelemetry(t: Telemetry): void {
  db.prepare(`
    INSERT INTO telemetry (
      device_id, timestamp, accel_x, accel_y, accel_z,
      gyro_x, gyro_y, gyro_z, magnitude, pir_motion,
      gps_lat, gps_lng, gps_valid, gps_satellites,
      buzzer_active, system_armed, free_heap, wifi_rssi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.device_id,
    t.timestamp || new Date().toISOString(),
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

export function getTelemetryHistory(deviceId: string, limit = 50): any[] {
  return db.prepare('SELECT * FROM telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?').all(deviceId, limit);
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

// Alerts methods
export function createAlert(alert: Alert): Alert {
  db.prepare(`
    INSERT INTO alerts (id, device_id, user_id, security_mode, alert_type, title, description, severity, timestamp, latitude, longitude, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    alert.id,
    alert.device_id,
    alert.user_id || 'usr_muskan',
    alert.security_mode || 'SYSTEM',
    alert.alert_type,
    alert.title,
    alert.description,
    alert.severity,
    alert.timestamp || new Date().toISOString(),
    alert.latitude,
    alert.longitude,
    alert.acknowledged || 0
  );
  return alert;
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
}

export function clearAlerts(deviceId?: string, userId?: string): void {
  if (deviceId && userId) {
    db.prepare('DELETE FROM alerts WHERE device_id = ? AND user_id = ?').run(deviceId, userId);
  } else if (deviceId) {
    db.prepare('DELETE FROM alerts WHERE device_id = ?').run(deviceId);
  } else if (userId) {
    db.prepare('DELETE FROM alerts WHERE user_id = ?').run(userId);
  } else {
    db.prepare('DELETE FROM alerts').run();
  }
}

// Events methods
export function logEvent(event: EventLog): EventLog {
  db.prepare(`
    INSERT INTO event_logs (id, device_id, user_id, security_mode, event_type, sensor, message, severity, timestamp, data_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.device_id,
    event.user_id || 'usr_muskan',
    event.security_mode || 'SYSTEM',
    event.event_type,
    event.sensor,
    event.message,
    event.severity,
    event.timestamp || new Date().toISOString(),
    event.data_payload || null
  );
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
