export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash: string;
  created_at: string;
}

export interface Device {
  id: string;
  device_id: string; // e.g. "ESP32-SECURITY-001"
  device_name: string;
  user_id: string;
  is_online: number; // 0 or 1
  is_armed: number; // 0 or 1
  last_seen: string;
  ip_address?: string;
  firmware_version?: string;
  wifi_rssi?: number;
  created_at: string;
}

export interface DeviceSettings {
  device_id: string;
  area_name: string; // e.g. "Hostel Room", "Bedroom", "Office"
  area_security_enabled: number; // 1 = Area PIR Monitoring Active, 0 = OFF
  belonging_name: string; // e.g. "Laptop Bag", "Backpack", "Suitcase"
  belonging_security_enabled: number; // 1 = Belonging MPU6050 Motion Monitoring Active, 0 = OFF
  security_mode?: string;
  movement_threshold: number; // in g, default 0.30
  sensitivity_preset?: string;
  pir_enabled: number; // 1 or 0
  mpu_enabled: number; // 1 or 0
  auto_buzzer: number; // 1 or 0
  silent_mode: number; // 1 or 0 (Covert anti-theft mode: phone alerts only, hardware silent)
  alarm_duration_sec: number; // default 15
  notification_motion: number; // 1 or 0
  notification_intrusion: number; // 1 or 0
  notification_offline: number; // 1 or 0
  notification_gps: number; // 1 or 0
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
  magnitude: number; // Delta magnitude in g
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
}

export interface Alert {
  id: string;
  device_id: string;
  user_id?: string;
  security_mode?: 'AREA' | 'BELONGING' | 'SYSTEM';
  alert_type: 'MOTION' | 'INTRUSION' | 'GPS_LOST' | 'DEVICE_OFFLINE' | 'DEVICE_ONLINE' | 'ARMED' | 'DISARMED' | 'ALARM_STOPPED';
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  acknowledged: number; // 0 or 1
  resolved?: number;
}

export interface EventLog {
  id: string;
  device_id: string;
  user_id?: string;
  security_mode?: 'AREA' | 'BELONGING' | 'SYSTEM';
  event_type: string;
  sensor: 'MPU6050' | 'PIR' | 'GPS' | 'BUZZER' | 'SYSTEM' | 'NETWORK';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  timestamp: string;
  data_payload?: string;
}

export type DeviceCommandType = 
  | 'AREA_SECURITY_ON'
  | 'AREA_SECURITY_OFF'
  | 'BELONGING_SECURITY_ON'
  | 'BELONGING_SECURITY_OFF'
  | 'SET_MODE_HOME'
  | 'SET_MODE_AWAY'
  | 'SET_MODE_TRAVEL'
  | 'SET_MODE_EMERGENCY'
  | 'REQUEST_GPS'
  | 'ARM'
  | 'DISARM'
  | 'BUZZER_ON'
  | 'BUZZER_OFF'
  | 'SET_THRESHOLD'
  | 'SET_SILENT_MODE'
  | 'ENABLE_PIR'
  | 'DISABLE_PIR'
  | 'ENABLE_MPU'
  | 'DISABLE_MPU'
  | 'GET_STATUS'
  | 'RESET_ALERT'
  | 'REBOOT'
  | string;

export interface DeviceCommand {
  command: DeviceCommandType;
  params?: Record<string, any>;
  timestamp: number;
  sender?: string;
}
