export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface Device {
  id: string;
  device_id: string;
  device_name: string;
  user_id: string;
  is_online: number;
  is_armed: number;
  last_seen: string;
  ip_address?: string;
  firmware_version?: string;
  wifi_rssi?: number;
  created_at: string;
}

export type SecurityModeType = 'HOME' | 'AWAY' | 'TRAVEL' | 'EMERGENCY' | 'CUSTOM';

export interface DeviceSettings {
  device_id: string;
  area_name: string; // e.g. "My Hostel Room", "Bedroom", "Office"
  area_security_enabled: number; // 1 = Active PIR Area Monitoring, 0 = OFF
  belonging_name: string; // e.g. "My Laptop Bag", "Backpack", "Suitcase"
  belonging_security_enabled: number; // 1 = Active MPU6050 Belonging Monitoring, 0 = OFF
  security_mode?: SecurityModeType;
  movement_threshold: number;
  sensitivity_preset?: 'LOW' | 'MEDIUM' | 'HIGH';
  pir_enabled: number;
  mpu_enabled: number;
  auto_buzzer: number;
  silent_mode: number; // 1 = Silent Covert Anti-Theft Mode (No buzzer sound, phone alert & GPS track only)
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
  acknowledged: number;
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
