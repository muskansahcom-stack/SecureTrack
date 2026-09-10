/**
 * SECUREBELONG: Personal Belonging & Area Security System
 * Complete ESP32 Production Firmware
 * 
 * Hardware:
 *  - ESP32 DevKit V1 (ESP-WROOM-32)
 *  - MPU6050 GY-521 (I2C: SDA=21, SCL=22)
 *  - HC-SR501 PIR Sensor (GPIO 13)
 *  - NEO-6M GPS Module (UART2: RX=16, TX=17)
 *  - 5V Active Buzzer (GPIO 23)
 */

#include <Arduino.h>
#include "config.h"
#include "sensors.h"
#include "gps_handler.h"
#include "buzzer.h"
#include "mqtt_handler.h"

// Hardware instances
SensorManager sensors;
GPSHandler gps;
BuzzerController buzzer;
MQTTManager mqtt(sensors, gps, buzzer);

// Timing trackers
unsigned long lastTelemetryMillis = 0;
unsigned long lastHeartbeatMillis = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("🛡️  SECUREBELONG IoT Firmware Initializing...");
  Serial.printf("📌 Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
  Serial.println("=======================================================");

  // 1. Initialize Buzzer & Output Pins
  buzzer.begin();
  Serial.println("[Init] Buzzer controller ready.");

  // 2. Initialize Sensors (MPU6050 & PIR)
  if (sensors.begin()) {
    Serial.println("[Init] MPU6050 & PIR sensors initialized.");
  } else {
    Serial.println("[Init] WARNING: MPU6050 not detected. Check I2C wiring.");
  }

  // 3. Initialize GPS (NEO-6M UART2)
  gps.begin();
  Serial.println("[Init] NEO-6M GPS serial interface started.");

  // 4. Initialize Wi-Fi and MQTT Client
  mqtt.begin();
  Serial.println("[Init] Network & MQTT subsystem started.");

  // Startup chirp
  buzzer.triggerAlarm(ALARM_CHIRP_ARM);

  Serial.println("[System] Boot sequence complete. Entering main operational loop.");
}

void loop() {
  // 1. Continuous high-frequency updates
  gps.update();
  buzzer.update();
  mqtt.update();

  unsigned long currentMillis = millis();

  // 2. Read Sensors
  MPUReadings mpuData = sensors.readMPU();
  PIRReadings pirData = sensors.readPIR();
  GPSData gpsData = gps.getData();

  bool isAreaArmed = mqtt.isAreaSecurityEnabled();
  bool isBelongingArmed = mqtt.isBelongingSecurityEnabled();
  bool isSystemArmed = isAreaArmed || isBelongingArmed;
  bool isSilent = mqtt.isSilentMode();

  // 3. Independent Security Event Detection Logic
  // A. MPU6050 Personal Belonging Movement Detection (Only when BELONGING security is ARMED)
  if (isBelongingArmed && mpuData.motion_detected) {
    Serial.printf("[Security] 🚨 BELONGING MOVEMENT DETECTED! Delta Mag: %.3fg (Threshold: %.2fg) [Silent: %s]\n",
                  mpuData.magnitude, sensors.getMovementThreshold(), isSilent ? "YES" : "NO");

    // Trigger audible siren immediately on physical buzzer if NOT in silent mode
    if (!isSilent) {
      buzzer.triggerAlarm(ALARM_INTRUSION_SIREN, DEFAULT_ALARM_DURATION_MS);
    }

    // Publish high-priority alert to MQTT
    mqtt.sendAlert(
      "MOTION",
      isSilent ? "🔕 [Covert] Personal Belonging Moved" : "🚨 Personal Belonging Moved",
      "Movement detected on protected personal belonging (Magnitude: " + String(mpuData.magnitude, 2) + "g)",
      "HIGH",
      gpsData.latitude,
      gpsData.longitude
    );
  }

  // B. HC-SR501 Area Intrusion Detection (Only when AREA security is ARMED)
  if (isAreaArmed && pirData.motion_detected) {
    Serial.println("[Security] 🚨 AREA INTRUSION DETECTED via HC-SR501 PIR sensor!");

    if (!isSilent) {
      buzzer.triggerAlarm(ALARM_INTRUSION_SIREN, DEFAULT_ALARM_DURATION_MS);
    }

    // Publish high-priority alert to MQTT
    mqtt.sendAlert(
      "INTRUSION",
      isSilent ? "🔕 [Covert] Area Intrusion Detected" : "🚨 Area Intrusion Detected",
      "PIR sensor triggered active human motion in protected area perimeter.",
      "CRITICAL",
      gpsData.latitude,
      gpsData.longitude
    );
  }

  // 4. Periodic Telemetry Transmission (Every 1000ms)
  if (currentMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = currentMillis;

    mqtt.sendTelemetry(mpuData, pirData, gpsData, isSystemArmed, buzzer.isActive());
  }

  // 5. Periodic Heartbeat Transmission (Every 5000ms)
  if (currentMillis - lastHeartbeatMillis >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMillis = currentMillis;

    mqtt.sendHeartbeat();
  }

  // Yield to FreeRTOS scheduler
  delay(10);
}
