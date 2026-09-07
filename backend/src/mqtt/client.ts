import mqtt, { MqttClient } from 'mqtt';
import { CONFIG } from '../config/index.js';
import { Telemetry, Alert, DeviceCommand } from '../types/index.js';
import {
  recordTelemetry,
  createAlert,
  logEvent,
  upsertDevice,
  getDeviceSettings,
  updateAreaSecurityState,
  updateBelongingSecurityState,
  updateDeviceArmedStatus,
  updateDeviceOnlineStatus,
} from '../database/db.js';
import { emitTelemetry, emitAlert, emitDeviceStatus, emitCommandAck } from '../websocket/socket.js';
import { registerBrokerMessageHandler, publishToBroker } from './broker.js';

let externalClient: MqttClient | null = null;

export function initMqttClient(): Promise<void> {
  return new Promise((resolve) => {
    // 1. Direct in-process message handler (Zero-overhead, connects directly to Aedes broker)
    registerBrokerMessageHandler((topic: string, messageBuffer: Buffer) => {
      try {
        const messageStr = messageBuffer.toString();
        const parts = topic.split('/');
        // Format: iot/security/{deviceId}/{type}
        if (parts.length < 4) return;
        const deviceId = parts[2];
        const messageType = parts[3];

        if (messageType === 'command') {
          // Skip commands in ingestion handler so they aren't processed as incoming sensor readings
          return;
        }

        const payload = JSON.parse(messageStr);
        handleIncomingMessage(deviceId, messageType, payload);
      } catch (err) {
        console.error('[MQTT Ingestion] Error processing message on topic', topic, err);
      }
    });

    console.log('[MQTT Bridge] In-process MQTT message handler registered.');

    // 2. If external broker is specified, also connect external client
    if (CONFIG.EXTERNAL_MQTT_URL) {
      console.log(`[MQTT Client] Connecting to external broker: ${CONFIG.EXTERNAL_MQTT_URL}...`);
      externalClient = mqtt.connect(CONFIG.EXTERNAL_MQTT_URL, {
        clientId: `SECUREBELONG_BACKEND_${Math.random().toString(16).substring(2, 8)}`,
        reconnectPeriod: 3000,
      });

      externalClient.on('connect', () => {
        console.log('[MQTT Client] Connected to external broker');
        externalClient?.subscribe('iot/security/+/+');
      });

      externalClient.on('message', (topic, payload) => {
        try {
          const parts = topic.split('/');
          if (parts.length >= 4 && parts[3] !== 'command') {
            handleIncomingMessage(parts[2], parts[3], JSON.parse(payload.toString()));
          }
        } catch (e) {}
      });
    }

    resolve();
  });
}

export function publishCommand(deviceId: string, command: DeviceCommand): boolean {
  const topic = `iot/security/${deviceId}/command`;
  const payloadStr = JSON.stringify(command);

  // Publish to embedded Aedes broker
  publishToBroker(topic, payloadStr);

  // Also publish to external broker if connected
  if (externalClient && externalClient.connected) {
    externalClient.publish(topic, payloadStr, { qos: 1 });
  }

  return true;
}

export function handleIncomingMessage(deviceId: string, type: string, payload: any) {
  const now = new Date().toISOString();

  upsertDevice({
    device_id: deviceId,
    is_online: 1,
    last_seen: now,
    wifi_rssi: payload.wifi_rssi || 0,
    firmware_version: payload.fw_ver || 'v1.0.0',
  });

  switch (type) {
    case 'telemetry': {
      const settings = getDeviceSettings(deviceId);
      const isAreaArmed = payload.area_security_enabled !== undefined 
        ? Boolean(payload.area_security_enabled) 
        : settings.area_security_enabled === 1;
      const isBelongingArmed = payload.belonging_security_enabled !== undefined 
        ? Boolean(payload.belonging_security_enabled) 
        : settings.belonging_security_enabled === 1;

      const telemetry: Telemetry = {
        device_id: deviceId,
        timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : now,
        mpu: {
          accel_x: Number(payload.mpu?.accel_x ?? payload.ax ?? 0),
          accel_y: Number(payload.mpu?.accel_y ?? payload.ay ?? 0),
          accel_z: Number(payload.mpu?.accel_z ?? payload.az ?? 0),
          gyro_x: Number(payload.mpu?.gyro_x ?? payload.gx ?? 0),
          gyro_y: Number(payload.mpu?.gyro_y ?? payload.gy ?? 0),
          gyro_z: Number(payload.mpu?.gyro_z ?? payload.gz ?? 0),
          magnitude: Number(payload.mpu?.magnitude ?? payload.mag ?? 0),
          motion_detected: Boolean(payload.mpu?.motion_detected ?? payload.motion ?? false),
        },
        pir: {
          motion: Boolean(payload.pir?.motion ?? payload.pir_motion ?? false),
          raw_val: Number(payload.pir?.raw_val ?? payload.pir_raw ?? 0),
        },
        gps: {
          latitude: payload.gps?.latitude ?? payload.gps?.lat ?? payload.lat ?? null,
          longitude: payload.gps?.longitude ?? payload.gps?.lng ?? payload.lng ?? null,
          valid: Boolean(payload.gps?.valid ?? payload.gps_valid ?? false),
          satellites: Number(payload.gps?.satellites ?? payload.sats ?? 0),
          altitude: payload.gps?.altitude ?? payload.alt,
          speed: payload.gps?.speed,
        },
        buzzer_active: Boolean(payload.buzzer_active ?? payload.buzzer ?? false),
        system_armed: Boolean(payload.system_armed ?? (isAreaArmed || isBelongingArmed)),
        area_security_enabled: isAreaArmed,
        belonging_security_enabled: isBelongingArmed,
        free_heap: payload.free_heap,
        uptime_sec: payload.uptime_sec,
        wifi_rssi: payload.wifi_rssi,
      };

      recordTelemetry(telemetry);
      emitTelemetry(telemetry);
      break;
    }

    case 'alerts': {
      const isArea = payload.alert_type === 'INTRUSION' || payload.security_mode === 'AREA';
      const alert: Alert = {
        id: payload.id || `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        device_id: deviceId,
        user_id: payload.user_id || 'usr_muskan',
        security_mode: isArea ? 'AREA' : 'BELONGING',
        alert_type: payload.alert_type || (isArea ? 'INTRUSION' : 'MOTION'),
        title: payload.title || (isArea ? '🚨 Area Intrusion Detected' : '🚨 Personal Belonging Moved'),
        description: payload.description || (isArea ? 'PIR sensor triggered area intrusion.' : 'MPU6050 detected belonging movement.'),
        severity: payload.severity || (isArea ? 'CRITICAL' : 'HIGH'),
        timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : now,
        latitude: payload.latitude || payload.lat || null,
        longitude: payload.longitude || payload.lng || null,
        acknowledged: 0,
      };

      createAlert(alert);
      emitAlert(alert);

      logEvent({
        id: `evt_alt_${Date.now()}`,
        device_id: deviceId,
        user_id: alert.user_id,
        security_mode: alert.security_mode,
        event_type: alert.alert_type,
        sensor: isArea ? 'PIR' : 'MPU6050',
        message: alert.description,
        severity: alert.severity,
        timestamp: alert.timestamp,
        data_payload: JSON.stringify({ lat: alert.latitude, lng: alert.longitude }),
      });
      break;
    }

    case 'status': {
      const hasArea = payload.area_security !== undefined || payload.area_armed !== undefined;
      const hasBelonging = payload.belonging_security !== undefined || payload.belonging_armed !== undefined;

      if (hasArea) {
        updateAreaSecurityState(deviceId, Boolean(payload.area_security ?? payload.area_armed));
      }
      if (hasBelonging) {
        updateBelongingSecurityState(deviceId, Boolean(payload.belonging_security ?? payload.belonging_armed));
      }

      const isArmed = payload.armed !== undefined ? Boolean(payload.armed) : Boolean(payload.is_armed);
      updateDeviceArmedStatus(deviceId, isArmed);

      emitDeviceStatus({
        device_id: deviceId,
        is_armed: isArmed ? 1 : 0,
        is_online: 1,
        last_seen: now,
        ip_address: payload.ip,
        wifi_rssi: payload.wifi_rssi,
      });
      break;
    }

    case 'heartbeat': {
      updateDeviceOnlineStatus(deviceId, true);
      emitDeviceStatus({
        device_id: deviceId,
        is_online: 1,
        last_seen: now,
        wifi_rssi: payload.wifi_rssi,
      });
      break;
    }

    case 'ack': {
      const cmd = String(payload.command || '').toUpperCase();
      if (cmd === 'AREA_SECURITY_ON' || cmd === 'AREA_SECURITY_ENABLED') {
        updateAreaSecurityState(deviceId, true);
      } else if (cmd === 'AREA_SECURITY_OFF' || cmd === 'AREA_SECURITY_DISABLED') {
        updateAreaSecurityState(deviceId, false);
      } else if (cmd === 'BELONGING_SECURITY_ON' || cmd === 'BELONGING_SECURITY_ENABLED') {
        updateBelongingSecurityState(deviceId, true);
      } else if (cmd === 'BELONGING_SECURITY_OFF' || cmd === 'BELONGING_SECURITY_DISABLED') {
        updateBelongingSecurityState(deviceId, false);
      }

      emitCommandAck(deviceId, {
        command: payload.command || 'UNKNOWN',
        success: payload.success !== false,
        message: payload.message || 'Command confirmed by ESP32',
        timestamp: Date.now(),
      });
      break;
    }
  }
}
