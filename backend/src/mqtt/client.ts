import mqtt, { MqttClient } from 'mqtt';
import { CONFIG } from '../config/index.js';
import { Telemetry, SecurityEvent, DeviceCommandType } from '../types/index.js';
import {
  recordTelemetry,
  recordSecurityEvent,
  getProtectedAssetByDeviceId,
  getDeviceSettings,
  updateAreaSecurityState,
  updateBelongingSecurityState,
  updateDeviceArmedStatus,
  updateDeviceOnlineStatus,
  registerOrUpdateDevice,
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
        
        let deviceId = '';
        let messageType = '';

        // Standard format: securebelong/device/{deviceId}/{type}
        if (parts[0] === 'securebelong' && parts[1] === 'device' && parts.length >= 4) {
          deviceId = parts[2];
          messageType = parts[3];
        } 
        // Legacy format: iot/security/{deviceId}/{type}
        else if (parts[0] === 'iot' && parts[1] === 'security' && parts.length >= 4) {
          deviceId = parts[2];
          messageType = parts[3];
        } else {
          return;
        }

        if (messageType === 'commands' || messageType === 'command') {
          // Skip commands in ingestion handler
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
        externalClient?.subscribe('securebelong/device/+/+');
        externalClient?.subscribe('iot/security/+/+');
      });

      externalClient.on('message', (topic, payload) => {
        try {
          const parts = topic.split('/');
          let deviceId = '';
          let messageType = '';

          if (parts[0] === 'securebelong' && parts[1] === 'device' && parts.length >= 4) {
            deviceId = parts[2];
            messageType = parts[3];
          } else if (parts[0] === 'iot' && parts[1] === 'security' && parts.length >= 4) {
            deviceId = parts[2];
            messageType = parts[3];
          }

          if (deviceId && messageType && messageType !== 'commands' && messageType !== 'command') {
            handleIncomingMessage(deviceId, messageType, JSON.parse(payload.toString()));
          }
        } catch (e) {}
      });
    }

    resolve();
  });
}

export function publishCommand(deviceId: string, command: { command: string; params?: any }): boolean {
  const standardTopic = `securebelong/device/${deviceId}/commands`;
  const legacyTopic = `iot/security/${deviceId}/command`;
  const payloadStr = JSON.stringify(command);

  // Publish to embedded Aedes broker on both standard and legacy topics
  publishToBroker(standardTopic, payloadStr);
  publishToBroker(legacyTopic, payloadStr);

  // Also publish to external broker if connected
  if (externalClient && externalClient.connected) {
    externalClient.publish(standardTopic, payloadStr, { qos: 1 });
    externalClient.publish(legacyTopic, payloadStr, { qos: 1 });
  }

  return true;
}

export function handleIncomingMessage(deviceId: string, type: string, payload: any) {
  const now = new Date().toISOString();

  registerOrUpdateDevice({
    device_uid: deviceId,
    status: 'ONLINE',
    wifi_rssi: payload.wifi_rssi,
    firmware_version: payload.fw_ver || payload.firmware_version || 'v1.0.0-PRO',
    ip_address: payload.ip,
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
        timestamp: payload.timestamp ? (typeof payload.timestamp === 'number' ? new Date(payload.timestamp).toISOString() : payload.timestamp) : now,
        mpu: {
          accel_x: Number(payload.mpu?.accel_x ?? payload.ax ?? payload.accelerometer_x ?? 0),
          accel_y: Number(payload.mpu?.accel_y ?? payload.ay ?? payload.accelerometer_y ?? 0),
          accel_z: Number(payload.mpu?.accel_z ?? payload.az ?? payload.accelerometer_z ?? 0),
          gyro_x: Number(payload.mpu?.gyro_x ?? payload.gx ?? payload.gyro_x ?? 0),
          gyro_y: Number(payload.mpu?.gyro_y ?? payload.gy ?? payload.gyro_y ?? 0),
          gyro_z: Number(payload.mpu?.gyro_z ?? payload.gz ?? payload.gyro_z ?? 0),
          magnitude: Number(payload.mpu?.magnitude ?? payload.mag ?? 0),
          motion_detected: Boolean(payload.mpu?.motion_detected ?? payload.motion ?? false),
        },
        pir: {
          motion: Boolean(payload.pir?.motion ?? payload.pir_motion ?? false),
          raw_val: Number(payload.pir?.raw_val ?? payload.pir_raw ?? 0),
        },
        gps: {
          latitude: payload.gps?.latitude ?? payload.gps?.lat ?? payload.lat ?? payload.latitude ?? null,
          longitude: payload.gps?.longitude ?? payload.gps?.lng ?? payload.lng ?? payload.longitude ?? null,
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
        battery: payload.battery,
      };

      recordTelemetry(telemetry);
      emitTelemetry(telemetry);
      break;
    }

    case 'events':
    case 'alerts': {
      const asset = getProtectedAssetByDeviceId(deviceId);
      const assetName = asset?.asset_name || 'Protected Asset';
      const eventType = payload.event_type || payload.alert_type || 'MOTION_DETECTED';

      let title = payload.title;
      let message = payload.message || payload.description;

      if (!title) {
        if (eventType === 'MOTION_DETECTED') {
          title = `🚨 Unexpected movement on ${assetName}`;
          message = message || `MPU6050 detected abnormal displacement on ${assetName}`;
        } else if (eventType === 'PIR_INTRUSION') {
          title = `🚨 Area Intrusion Detected`;
          message = message || `HC-SR501 PIR sensor triggered perimeter breach in protected area`;
        } else if (eventType === 'ALARM_STARTED') {
          title = `🔊 Siren Activated on ${assetName}`;
          message = message || `Physical buzzer & police siren activated on device ${deviceId}`;
        } else if (eventType === 'ALARM_STOPPED') {
          title = `🔕 Siren Silenced`;
          message = message || `Physical alarm stopped on device ${deviceId}`;
        } else if (eventType === 'DEVICE_ONLINE') {
          title = `● Hardware Connected`;
          message = message || `ESP32 (${deviceId}) connected to SecureBelong Gateway`;
        } else {
          title = `Security Event: ${eventType}`;
          message = message || `Event triggered on device ${deviceId}`;
        }
      }

      const secEvent: SecurityEvent = {
        id: payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        device_id: deviceId,
        asset_id: asset?.id || payload.asset_id,
        user_id: asset?.user_id || payload.user_id || 'usr_muskan',
        event_type: eventType,
        title,
        message,
        severity: payload.severity || (eventType === 'MOTION_DETECTED' || eventType === 'PIR_INTRUSION' ? 'CRITICAL' : 'HIGH'),
        latitude: payload.latitude ?? payload.lat ?? null,
        longitude: payload.longitude ?? payload.lng ?? null,
        alarm_status: payload.alarm_status || (eventType === 'MOTION_DETECTED' || eventType === 'PIR_INTRUSION' || eventType === 'ALARM_STARTED' ? 'ACTIVE' : 'STOPPED'),
        created_at: payload.timestamp ? (typeof payload.timestamp === 'number' ? new Date(payload.timestamp).toISOString() : payload.timestamp) : now,
        acknowledged: 0,
      };

      recordSecurityEvent(secEvent);
      
      // Emit both real-time alert and event
      emitAlert({
        id: secEvent.id,
        device_id: deviceId,
        asset_id: secEvent.asset_id,
        user_id: secEvent.user_id || 'usr_muskan',
        alert_type: eventType,
        title: secEvent.title || title,
        description: secEvent.message || message,
        severity: secEvent.severity,
        timestamp: secEvent.created_at,
        latitude: secEvent.latitude || null,
        longitude: secEvent.longitude || null,
        acknowledged: 0,
      });
      break;
    }

    case 'status': {
      const isArmed = payload.armed !== undefined ? Boolean(payload.armed) : Boolean(payload.is_armed);
      updateDeviceArmedStatus(deviceId, isArmed);
      updateDeviceOnlineStatus(deviceId, true, payload.ip, payload.wifi_rssi, payload.fw_ver);

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
      updateDeviceOnlineStatus(deviceId, true, undefined, payload.wifi_rssi);
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
      if (cmd === 'ARM' || cmd === 'ARM_PROTECTION' || cmd === 'BELONGING_SECURITY_ON') {
        updateBelongingSecurityState(deviceId, true);
      } else if (cmd === 'DISARM' || cmd === 'DISARM_PROTECTION' || cmd === 'BELONGING_SECURITY_OFF') {
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
