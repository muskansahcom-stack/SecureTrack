/**
 * SECUREBELONG - Physical ESP32 Hardware Simulator & Test CLI
 * Use this script to test end-to-end MQTT communication, telemetry ingestion,
 * sensor triggers, and remote commands as if an actual ESP32 is running on the network.
 * 
 * Run with: node esp32/simulator.js
 */

import mqtt from '../backend/node_modules/mqtt/build/index.js';

const DEVICE_ID = 'ESP32-SECURITY-001';
const BROKER_URL = 'mqtt://127.0.0.1:1883';

console.log(`=======================================================`);
console.log(`🔌 SECUREBELONG ESP32 Hardware Simulator CLI`);
console.log(`Connecting to MQTT Broker at ${BROKER_URL}...`);
console.log(`=======================================================`);

const client = mqtt.connect(BROKER_URL, {
  clientId: DEVICE_ID,
  will: {
    topic: `iot/security/${DEVICE_ID}/status`,
    payload: JSON.stringify({ is_online: 0, status: 'OFFLINE' }),
    qos: 1,
    retain: true
  }
});

client.on('error', (err) => {
  console.error('[ESP32 Simulator Error]', err.message);
});

client.on('reconnect', () => {
  console.log('[ESP32 Simulator] Reconnecting to broker...');
});

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

client.on('connect', () => {
  console.log(`✅ [ESP32 Simulator] Connected to MQTT Broker! Device ID: ${DEVICE_ID}`);

  // Subscribe to command topic
  const commandTopic = `iot/security/${DEVICE_ID}/command`;
  client.subscribe(commandTopic, () => {
    console.log(`📡 [ESP32 Simulator] Subscribed to command topic: ${commandTopic}`);
  });

  // Publish Online Status
  sendStatus();

  console.log(`\n⌨️  INTERACTIVE KEYBOARD SHORTCUTS:`);
  console.log(`  [1] -> Toggle AREA SECURITY ON/OFF (HC-SR501 PIR)`);
  console.log(`  [2] -> Toggle PERSONAL BELONGING SECURITY ON/OFF (MPU6050)`);
  console.log(`  [p] -> Trigger HC-SR501 PIR Area Intrusion`);
  console.log(`  [m] -> Trigger MPU6050 Belonging Movement (Bag Lift / Movement)`);
  console.log(`  [s] -> Toggle Silent Covert Anti-Theft Mode`);
  console.log(`  [g] -> Toggle GPS Route Movement (Thief moving with bag)`);
  console.log(`  [b] -> Toggle Buzzer Siren`);
  console.log(`  [a] -> Toggle MASTER ARM (Both modes)`);
  console.log(`  [q] -> Disconnect & Exit\n`);

  // Start Telemetry loop (every 1 second)
  setInterval(publishTelemetry, 1000);

  // Start Heartbeat loop (every 5 seconds)
  setInterval(publishHeartbeat, 5000);
});

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`\n📥 [Command Received from App]:`, payload);

    const cmd = payload.command;
    
    // 1. Area Security Commands
    if (cmd === 'AREA_SECURITY_ON') {
      isAreaActive = true;
      console.log(`🟢 [ESP32 State] -> AREA SECURITY ACTIVE (HC-SR501 PIR armed)`);
      sendAck('AREA_SECURITY_ENABLED', true, 'Area security armed');
      sendStatus();
    } else if (cmd === 'AREA_SECURITY_OFF') {
      isAreaActive = false;
      console.log(`⚪ [ESP32 State] -> AREA SECURITY DISABLED`);
      sendAck('AREA_SECURITY_DISABLED', true, 'Area security disarmed');
      sendStatus();
    }

    // 2. Personal Belonging Security Commands
    else if (cmd === 'BELONGING_SECURITY_ON') {
      isBelongingActive = true;
      console.log(`🟢 [ESP32 State] -> PERSONAL BELONGING ACTIVE (MPU6050 armed)`);
      sendAck('BELONGING_SECURITY_ENABLED', true, 'Personal belonging security armed');
      sendStatus();
    } else if (cmd === 'BELONGING_SECURITY_OFF') {
      isBelongingActive = false;
      console.log(`⚪ [ESP32 State] -> PERSONAL BELONGING DISABLED`);
      sendAck('BELONGING_SECURITY_DISABLED', true, 'Personal belonging security disarmed');
      sendStatus();
    }

    // 3. Master Arm / Disarm
    else if (cmd === 'ARM') {
      isAreaActive = true;
      isBelongingActive = true;
      console.log(`🔒 [ESP32 State] -> ALL MODES ARMED`);
      sendAck('ARM', true, 'All security modes armed');
      sendStatus();
    } else if (cmd === 'DISARM') {
      isAreaActive = false;
      isBelongingActive = false;
      buzzerActive = false;
      console.log(`🔓 [ESP32 State] -> ALL MODES DISARMED`);
      sendAck('DISARM', true, 'All security modes disarmed');
      sendStatus();
    }

    // 4. Physical Buzzer
    else if (cmd === 'BUZZER_ON') {
      buzzerActive = true;
      console.log(`🚨 [ESP32 Hardware] -> BUZZER SIREN ON`);
      sendAck('BUZZER_ON', true, 'Buzzer turned ON');
    } else if (cmd === 'BUZZER_OFF') {
      buzzerActive = false;
      console.log(`🔇 [ESP32 Hardware] -> BUZZER SIREN OFF`);
      sendAck('BUZZER_OFF', true, 'Buzzer stopped');
    }

    // 5. Config & Silent Mode
    else if (cmd === 'SET_SILENT_MODE') {
      if (payload.params && payload.params.silent_mode !== undefined) {
        isSilentMode = payload.params.silent_mode === 1;
      } else {
        isSilentMode = !isSilentMode;
      }
      console.log(`🔕 [ESP32 State] -> SILENT COVERT MODE: ${isSilentMode ? 'ON' : 'OFF'}`);
      sendAck('SET_SILENT_MODE', true, `Silent mode ${isSilentMode ? 'enabled' : 'disabled'}`);
    } else if (cmd === 'SET_THRESHOLD') {
      if (payload.params && payload.params.threshold) {
        movementThreshold = payload.params.threshold;
        console.log(`⚙️  [ESP32 Config] -> Movement threshold updated to: ${movementThreshold}g`);
        sendAck('SET_THRESHOLD', true, `Threshold set to ${movementThreshold}g`);
      }
    } else if (cmd === 'GET_STATUS') {
      sendStatus();
      sendAck('GET_STATUS', true, 'Status broadcasted');
    }
  } catch (err) {
    console.error('Error handling command:', err);
  }
});

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

  client.publish(`iot/security/${DEVICE_ID}/telemetry`, JSON.stringify(telemetryPayload));

  // 1. Belonging Alert (Only when belonging security is ON)
  if (isBelongingActive && mpuMotion) {
    console.log(`🚨 [ALERT GENERATED] Personal Belonging Moved! (Silent: ${isSilentMode})`);
    client.publish(`iot/security/${DEVICE_ID}/alerts`, JSON.stringify({
      device_id: DEVICE_ID,
      security_mode: 'BELONGING',
      alert_type: 'MOTION',
      title: isSilentMode ? '🔕 [Covert] Personal Belonging Moved' : '🚨 Personal Belonging Moved',
      description: `Movement detected on protected personal belonging (Magnitude: ${mag.toFixed(2)}g)`,
      severity: 'HIGH',
      timestamp: Date.now(),
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6))
    }), { retain: true });

    if (!isSilentMode) {
      buzzerActive = true;
    }
    mpuMotion = false;
  } else if (!isBelongingActive && mpuMotion) {
    console.log(`ℹ️ [Notice] Belonging movement ignored because Belonging Security is OFF.`);
    mpuMotion = false;
  }

  // 2. Area Intrusion Alert (Only when area security is ON)
  if (isAreaActive && pirMotion) {
    console.log(`🚨 [ALERT GENERATED] Area Intrusion Detected! (Silent: ${isSilentMode})`);
    client.publish(`iot/security/${DEVICE_ID}/alerts`, JSON.stringify({
      device_id: DEVICE_ID,
      security_mode: 'AREA',
      alert_type: 'INTRUSION',
      title: isSilentMode ? '🔕 [Covert] Area Intrusion Detected' : '🚨 Area Intrusion Detected',
      description: 'PIR sensor triggered active human motion in protected area perimeter.',
      severity: 'CRITICAL',
      timestamp: Date.now(),
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6))
    }), { retain: true });

    if (!isSilentMode) {
      buzzerActive = true;
    }
    pirMotion = false;
  } else if (!isAreaActive && pirMotion) {
    console.log(`ℹ️ [Notice] PIR intrusion ignored because Area Security is OFF.`);
    pirMotion = false;
  }
}

function publishHeartbeat() {
  client.publish(`iot/security/${DEVICE_ID}/heartbeat`, JSON.stringify({
    device_id: DEVICE_ID,
    wifi_rssi: -54,
    uptime_sec: Math.floor(process.uptime())
  }));
}

function sendStatus() {
  const isAnyArmed = isAreaActive || isBelongingActive;
  client.publish(`iot/security/${DEVICE_ID}/status`, JSON.stringify({
    device_id: DEVICE_ID,
    is_online: 1,
    armed: isAnyArmed ? 1 : 0,
    area_security: isAreaActive ? 1 : 0,
    belonging_security: isBelongingActive ? 1 : 0,
    ip: '192.168.1.155',
    wifi_rssi: -54,
    fw_ver: 'v1.0.0'
  }), { retain: true });
}

function sendAck(command, success, message) {
  client.publish(`iot/security/${DEVICE_ID}/ack`, JSON.stringify({
    device_id: DEVICE_ID,
    command,
    success,
    message,
    timestamp: Date.now()
  }));
}

// Enable raw stdin mode for single keypress events
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === 'q' || key === '\u0003') { // q or Ctrl+C
      console.log('\nExiting simulator...');
      client.end();
      process.exit();
    }
    if (key === '1') {
      isAreaActive = !isAreaActive;
      console.log(`\n[Toggle] Area Security (HC-SR501 PIR): ${isAreaActive ? 'ACTIVE 🟢' : 'OFF ⚪'}`);
      sendStatus();
    }
    if (key === '2') {
      isBelongingActive = !isBelongingActive;
      console.log(`\n[Toggle] Personal Belonging (MPU6050): ${isBelongingActive ? 'ACTIVE 🟢' : 'OFF ⚪'}`);
      sendStatus();
    }
    if (key === 'p') {
      console.log('\n[Trigger] HC-SR501 PIR Area Intrusion Triggered!');
      pirMotion = true;
    }
    if (key === 'm') {
      console.log('\n[Trigger] MPU6050 Belonging Movement Triggered! (Bag moved)');
      mpuMotion = true;
    }
    if (key === 's') {
      isSilentMode = !isSilentMode;
      console.log(`\n[Toggle] Silent Covert Mode: ${isSilentMode ? 'ON 🔕 (Buzzer Muted)' : 'OFF 🔔 (Audible Siren)'}`);
    }
    if (key === 'g') {
      isMovingAlongRoute = !isMovingAlongRoute;
      console.log(`\n[Toggle] GPS Route Movement Simulation: ${isMovingAlongRoute ? 'MOVING 🚶 (Generating breadcrumbs)' : 'STOPPED 🛑'}`);
    }
    if (key === 'a') {
      const toggle = !(isAreaActive || isBelongingActive);
      isAreaActive = toggle;
      isBelongingActive = toggle;
      console.log(`\n[Toggle] Master System State: ${toggle ? 'ARMED 🔒' : 'DISARMED 🔓'}`);
      sendStatus();
    }
    if (key === 'b') {
      buzzerActive = !buzzerActive;
      console.log(`\n[Toggle] Buzzer Siren ${buzzerActive ? 'ON' : 'OFF'}`);
    }
  });
}
