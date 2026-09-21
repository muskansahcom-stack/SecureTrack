export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash: string;
  created_at: string;
}

export type DeviceStatusType = 'ONLINE' | 'OFFLINE' | 'UNPAIRED';

export interface Device {
  id: string;
  device_uid: string; // e.g. "ESP32-SECURITY-001"
  device_id?: string; // compatibility alias
  device_model: string; // e.g. "ESP32 DevKit V1"
  device_name: string;
  user_id?: string;
  status: DeviceStatusType; // "ONLINE" | "OFFLINE" | "UNPAIRED"
  is_online?: number; // 0 or 1
  is_armed?: number; // 0 or 1
  last_seen: string;
  ip_address?: string;
  firmware_version?: string;
  wifi_rssi?: number;
  battery_level?: number;
  created_at: string;
}

export type AssetType = 'LAPTOP' | 'BACKPACK' | 'LUGGAGE' | 'VEHICLE' | 'OTHER';
export type ProtectionModeType = 'PERSONAL_BELONGING' | 'AREA_SECURITY' | 'COMBINED';

export interface ProtectedAsset {
  id: string;
  user_id: string;
  device_id: string; // foreign key to devices.device_uid
  asset_name: string; // e.g. "My Laptop"
  asset_type: AssetType; // e.g. "LAPTOP"
  protection_mode: ProtectionModeType; // e.g. "PERSONAL_BELONGING"
  armed: boolean | number; // true/1 or false/0
  created_at: string;
}

export interface SensorReading {
  id?: number;
  device_id: string;
  accelerometer_x: number;
  accelerometer_y: number;
  accelerometer_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  latitude: number | null;
  longitude: number | null;
  wifi_rssi: number | null;
  battery: number | null;
  timestamp: string;
}

export type SecurityEventType =
  | 'MOTION_DETECTED'
  | 'PIR_INTRUSION'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'GPS_UPDATED'
  | 'ALARM_STARTED'
  | 'ALARM_STOPPED';

export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlarmStatus = 'ACTIVE' | 'STOPPED' | 'CLEARED' | 'IDLE';

export interface SecurityEvent {
  id: string;
  device_id: string;
  asset_id?: string | null;
  user_id?: string | null;
  event_type: SecurityEventType | string;
  title?: string;
  message?: string;
  severity: EventSeverity;
  latitude?: number | null;
  longitude?: number | null;
  alarm_status: AlarmStatus | string;
  created_at: string;
  acknowledged?: number;
}

export interface DeviceSettings {
  device_id: string;
  area_name: string;
  area_security_enabled: number;
  belonging_name: string;
  belonging_security_enabled: number;
  security_mode?: string;
  movement_threshold: number; // in g, default 0.30
  sensitivity_preset?: string;
  pir_enabled: number;
  mpu_enabled: number;
  auto_buzzer: number;
  silent_mode: number;
  alarm_duration_sec: number;
  notification_motion: number;
  notification_intrusion: number;
  notification_offline: number;
  notification_gps: number;
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  timestamp: string;
}

export interface MPUData {
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  magnitude: number;
  motion_detected: boolean;
}

export interface GPSData {
  latitude: number | null;
  longitude: number | null;
  valid: boolean;
  satellites: number;
  altitude?: number;
  speed?: number;
}

export interface Telemetry {
  id?: number;
  device_id: string;
  timestamp: string;
  mpu: MPUData;
  pir: {
    motion: boolean;
    raw_val: number;
  };
  gps: GPSData;
  buzzer_active: boolean;
  system_armed: boolean;
  area_security_enabled?: boolean;
  belonging_security_enabled?: boolean;
  free_heap?: number;
  uptime_sec?: number;
  wifi_rssi?: number;
  battery?: number;
}

export interface Alert {
  id: string;
  device_id: string;
  asset_id?: string | null;
  user_id?: string;
  security_mode?: 'AREA' | 'BELONGING' | 'SYSTEM';
  alert_type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  acknowledged: number;
  resolved?: number;
}

export interface EventLog {
  id: string;
  device_id: string;
  asset_id?: string | null;
  user_id?: string;
  security_mode?: 'AREA' | 'BELONGING' | 'SYSTEM';
  event_type: string;
  sensor: 'MPU6050' | 'PIR' | 'GPS' | 'BUZZER' | 'SYSTEM' | 'NETWORK';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  data_payload?: string;
}

export type DeviceCommandType =
  | 'ARM'
  | 'DISARM'
  | 'STOP_SIREN'
  | 'REQUEST_STATUS'
  | 'SET_CONFIG';

export type SecurityModeType = 'HOME' | 'AWAY' | 'NIGHT' | 'TRAVEL' | 'CUSTOM' | 'EMERGENCY';
