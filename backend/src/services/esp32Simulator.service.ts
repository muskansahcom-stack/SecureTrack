import { publishToBroker, registerBrokerMessageHandler } from '../mqtt/broker.js';
import { updateDeviceOnlineStatus } from '../database/db.js';
import { emitDeviceStatus } from '../websocket/socket.js';

const DEVICE_ID = 'ESP32-SECURITY-001';

let isAreaActive = false;
let isBelongingActive = false;
let isSilentMode = false;
let buzzerActive = false;
let movementThreshold = 0.30;
let pirMotion = false;
let mpuMotion = false;
let isMovingAlongRoute = false;

// GPS tracking state
let currentLat = 28.613939;
let currentLng = 77.209021;
let currentSpeed = 0.0;
let routeStep = 0;

let telemetryInterval: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export function triggerSimulatedMotion(type: 'MOTION' | 'INTRUSION') {
  if (type === 'MOTION') {
    mpuMotion = true;
  } else if (type === 'INTRUSION') {
    pirMotion = true;
  }
}

export function toggleSimulatedRouteMovement(moving?: boolean) {
  if (moving !== undefined) {
    isMovingAlongRoute = moving;
  } else {
    isMovingAlongRoute = !isMovingAlongRoute;
  }
  return isMovingAlongRoute;
}

export function startInProcessSimulator() {
  console.log(`[ESP32 Simulator Engine] Initializing in-process simulation for ${DEVICE_ID}...`);

  // 1. Mark device online
  updateDeviceOnlineStatus(DEVICE_ID, true);
  emitDeviceStatus({ device_id: DEVICE_ID, is_online: 1 });

  // 2. Register command handler for MQTT topic
  registerBrokerMessageHandler((topic: string, payload: Buffer) => {
    if (topic === `iot/security/${DEVICE_ID}/command`) {
      try {
        const data = JSON.parse(payload.toString());
        const cmd = data.command;
        console.log(`[ESP32 In-Process Simulator] Received command:`, cmd);

        if (cmd === 'AREA_SECURITY_ON') {
          isAreaActive = true;
          sendAck('AREA_SECURITY_ENABLED', true, 'Area security armed');
          sendStatus();
        } else if (cmd === 'AREA_SECURITY_OFF') {
          isAreaActive = false;
          sendAck('AREA_SECURITY_DISABLED', true, 'Area security disarmed');
          sendStatus();
        } else if (cmd === 'BELONGING_SECURITY_ON') {
          isBelongingActive = true;
          sendAck('BELONGING_SECURITY_ENABLED', true, 'Personal belonging security armed');
          sendStatus();
        } else if (cmd === 'BELONGING_SECURITY_OFF') {
          isBelongingActive = false;
          sendAck('BELONGING_SECURITY_DISABLED', true, 'Personal belonging security disarmed');
          sendStatus();
        } else if (cmd === 'ARM') {
          isAreaActive = true;
          isBelongingActive = true;
          sendAck('ARM', true, 'All security modes armed');
          sendStatus();
        } else if (cmd === 'DISARM') {
          isAreaActive = false;
          isBelongingActive = false;
          buzzerActive = false;
          sendAck('DISARM', true, 'All security modes disarmed');
          sendStatus();
        } else if (cmd === 'BUZZER_ON') {
          buzzerActive = true;
          sendAck('BUZZER_ON', true, 'Buzzer turned ON');
        } else if (cmd === 'BUZZER_OFF') {
          buzzerActive = false;
          sendAck('BUZZER_OFF', true, 'Buzzer stopped');
        } else if (cmd === 'SET_SILENT_MODE') {
          if (data.params && data.params.silent_mode !== undefined) {
            isSilentMode = data.params.silent_mode === 1;
          } else {
            isSilentMode = !isSilentMode;
          }
          sendAck('SET_SILENT_MODE', true, `Silent mode ${isSilentMode ? 'enabled' : 'disabled'}`);
        } else if (cmd === 'SET_THRESHOLD') {
          if (data.params && data.params.threshold) {
            movementThreshold = data.params.threshold;
            sendAck('SET_THRESHOLD', true, `Threshold set to ${movementThreshold}g`);
          }
        } else if (cmd === 'GET_STATUS') {
          sendStatus();
          sendAck('GET_STATUS', true, 'Status broadcasted');
        }
      } catch (err) {
        console.error('[ESP32 Simulator] Error processing message:', err);
      }
    }
  });

  // 3. Start Telemetry loop
  if (telemetryInterval) clearInterval(telemetryInterval);
  telemetryInterval = setInterval(publishTelemetry, 1000);

  // 4. Start Heartbeat loop
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(publishHeartbeat, 5000);

  sendStatus();
  console.log(`[ESP32 Simulator Engine] Ready and streaming live telemetry.`);
}

function publishTelemetry() {
  const noise = (Math.random() - 0.5) * 0.03;
  const mag = mpuMotion ? 0.85 : Math.abs(noise);

  if (isMovingAlongRoute) {
    routeStep += 1;
    currentLat += (Math.sin(routeStep * 0.2) * 0.00015) + 0.00008;
    currentLng += (Math.cos(routeStep * 0.2) * 0.00015) + 0.00010;
    currentSpeed = 4.8 + (Math.random() - 0.5) * 0.8;
  } else {
    currentSpeed = 0.0;
  }

  const isAnyArmed = isAreaActive || isBelongingActive;

  const telemetryPayload = {
    device_id: DEVICE_ID,
    timestamp: Date.now(),
    mpu: {
      accel_x: parseFloat(((Math.random() - 0.5) * 0.04).toFixed(3)),
      accel_y: parseFloat(((Math.random() - 0.5) * 0.04).toFixed(3)),
      accel_z: parseFloat((1.0 + noise).toFixed(3)),
      gyro_x: parseFloat(((Math.random() - 0.5) * 1.5).toFixed(2)),
      gyro_y: parseFloat(((Math.random() - 0.5) * 1.5).toFixed(2)),
      gyro_z: parseFloat(((Math.random() - 0.5) * 1.5).toFixed(2)),
      magnitude: parseFloat(mag.toFixed(3)),
      motion_detected: mpuMotion || isMovingAlongRoute
    },
    pir: {
      motion: pirMotion,
      raw_val: pirMotion ? 1 : 0
    },
    gps: {
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6)),
      valid: true,
      satellites: 9,
      altitude: 216.0,
      speed: parseFloat(currentSpeed.toFixed(1))
    },
    buzzer_active: buzzerActive,
    system_armed: isAnyArmed,
    area_security_enabled: isAreaActive,
    belonging_security_enabled: isBelongingActive,
    wifi_rssi: -54,
    free_heap: 198420,
    uptime_sec: Math.floor(process.uptime())
  };

  publishToBroker(`iot/security/${DEVICE_ID}/telemetry`, JSON.stringify(telemetryPayload));

  // 1. Belonging Alert
  if (isBelongingActive && mpuMotion) {
    publishToBroker(`iot/security/${DEVICE_ID}/alerts`, JSON.stringify({
      device_id: DEVICE_ID,
      security_mode: 'BELONGING',
      alert_type: 'MOTION',
      title: isSilentMode ? '🔕 [Covert] Personal Belonging Moved' : '🚨 Personal Belonging Moved',
      description: `Movement detected on protected personal belonging (Magnitude: ${mag.toFixed(2)}g)`,
      severity: 'HIGH',
      timestamp: Date.now(),
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6))
    }));

    if (!isSilentMode) {
      buzzerActive = true;
    }
    mpuMotion = false;
  } else if (!isBelongingActive && mpuMotion) {
    mpuMotion = false;
  }

  // 2. Area Intrusion Alert
  if (isAreaActive && pirMotion) {
    publishToBroker(`iot/security/${DEVICE_ID}/alerts`, JSON.stringify({
      device_id: DEVICE_ID,
      security_mode: 'AREA',
      alert_type: 'INTRUSION',
      title: isSilentMode ? '🔕 [Covert] Area Intrusion Detected' : '🚨 Area Intrusion Detected',
      description: 'PIR sensor triggered active human motion in protected area perimeter.',
      severity: 'CRITICAL',
      timestamp: Date.now(),
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6))
    }));

    if (!isSilentMode) {
      buzzerActive = true;
    }
    pirMotion = false;
  } else if (!isAreaActive && pirMotion) {
    pirMotion = false;
  }
}

function publishHeartbeat() {
  publishToBroker(`iot/security/${DEVICE_ID}/heartbeat`, JSON.stringify({
    device_id: DEVICE_ID,
    wifi_rssi: -54,
    uptime_sec: Math.floor(process.uptime())
  }));
}

function sendStatus() {
  const isAnyArmed = isAreaActive || isBelongingActive;
  publishToBroker(`iot/security/${DEVICE_ID}/status`, JSON.stringify({
    device_id: DEVICE_ID,
    is_online: 1,
    armed: isAnyArmed ? 1 : 0,
    area_security: isAreaActive ? 1 : 0,
    belonging_security: isBelongingActive ? 1 : 0,
    ip: '192.168.1.155',
    wifi_rssi: -54,
    fw_ver: 'v1.0.0'
  }));
}

function sendAck(command: string, success: boolean, message: string) {
  publishToBroker(`iot/security/${DEVICE_ID}/ack`, JSON.stringify({
    device_id: DEVICE_ID,
    command,
    success,
    message,
    timestamp: Date.now()
  }));
}
