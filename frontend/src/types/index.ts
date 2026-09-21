export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export type DeviceStatusType = 'ONLINE' | 'OFFLINE' | 'UNPAIRED';

export interface Device {
  id: string;
  device_uid?: string;
  device_id: string; // e.g. "ESP32-SECURITY-001"
  device_model?: string;
  device_name: string;
  user_id: string;
  status?: DeviceStatusType;
  is_online: number;
  is_armed: number;
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
  device_id: string;
  asset_name: string;
  asset_type: AssetType;
  protection_mode: ProtectionModeType;
  armed: boolean | number;
  created_at: string;
}

export type SecurityModeType = 'HOME' | 'AWAY' | 'TRAVEL' | 'EMERGENCY' | 'CUSTOM';

export interface DeviceSettings {
  device_id: string;
  area_name: string;
  area_security_enabled: number;
  belonging_name: string;
  belonging_security_enabled: number;
  security_mode?: SecurityModeType;
  movement_threshold: number;
  sensitivity_preset?: 'LOW' | 'MEDIUM' | 'HIGH';
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
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH';
  movement_status?: 'NORMAL' | 'MOVEMENT' | 'HIGH MOVEMENT';
}

export interface GPSData {
  latitude: number | null;
  longitude: number | null;
  valid: boolean;
  satellites: number;
  altitude?: number;
  speed?: number;
  last_update?: string;
}

export interface Telemetry {
  id?: number;
  device_id: string;
  timestamp: string;
  mpu: MPUData;
  pir: {
    motion: boolean;
    raw_val: number;
    detection_count?: number;
    last_detected?: string;
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

export type SecurityEventType =
  | 'MOTION_DETECTED'
  | 'PIR_INTRUSION'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'GPS_UPDATED'
  | 'ALARM_STARTED'
  | 'ALARM_STOPPED';

export interface SecurityEvent {
  id: string;
  device_id: string;
  asset_id?: string | null;
  user_id?: string | null;
  event_type: SecurityEventType | string;
  title?: string;
  message?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  latitude?: number | null;
  longitude?: number | null;
  alarm_status: 'ACTIVE' | 'STOPPED' | 'CLEARED' | 'IDLE' | string;
  created_at: string;
  acknowledged?: number;
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  timestamp: string;
  data_payload?: string;
}

export interface CommandAuditItem {
  id: string;
  command: string;
  target_device: string;
  timestamp: string;
  status: 'SENDING' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';
  response_message?: string;
}

export interface SensorHealthStatus {
  mpu: 'OPERATIONAL' | 'TIMEOUT' | 'ERROR';
  pir: 'OPERATIONAL' | 'TIMEOUT' | 'DISABLED';
  gps: 'LOCKED' | 'SEARCHING' | 'UNAVAILABLE';
  buzzer: 'OPERATIONAL' | 'ERROR';
  overallScore: number;
}

export type AppTab = 'dashboard' | 'sensors' | 'location' | 'alerts' | 'health' | 'settings';
