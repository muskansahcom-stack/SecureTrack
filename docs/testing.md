# SECUREBELONG: 12-Step Critical Hardware Acceptance Tests

This verification manual outlines exact execution steps for testing the physical ESP32 breadboard assembly and mobile dashboard.

---

### Acceptance Test Matrix

| Test ID | Test Objective | Procedure | Expected Physical Response | Expected Mobile UI Response |
|---|---|---|---|---|
| **TEST 1** | **ESP32 Power & Connection** | 1. Power on ESP32 via USB cable.<br>2. Open SECUREBELONG dashboard. | ESP32 status LED illuminates; serial monitor shows Wi-Fi and MQTT connected. | Top status pill immediately shows `ESP32 ONLINE ✓` with live latency timer. |
| **TEST 2** | **MPU6050 Movement Trigger** | 1. Ensure system is ARMED.<br>2. Tilt, shake, or tap the MPU6050 sensor board. | ESP32 detects $\Delta > \text{threshold}$, publishes alert payload, triggers buzzer pulse pattern. | High-priority alert banner pops up: `🚨 Personal Belonging Moved` with displacement magnitude. |
| **TEST 3** | **HC-SR501 PIR Motion Trigger** | 1. Ensure system is ARMED.<br>2. Wave hand in front of the PIR sensor dome. | PIR digital pin 13 goes HIGH; ESP32 detects intrusion and publishes critical alert. | App displays `🚨 Area Intrusion Detected` and area status tile flashes red with `🚨 Intrusion`. |
| **TEST 4** | **Physical Alarm Activation** | 1. Trigger PIR or MPU6050 while ARMED. | Physical 5V active buzzer on GPIO 23 turns ON loudly. | `Alarm Siren` tile changes to `🚨 Active Siren` and plays audible chime in app. |
| **TEST 5** | **Remote Buzzer Silence** | 1. While buzzer is sounding, tap `STOP BUZZER` in the app. | Mobile app dispatches `BUZZER_OFF` command via MQTT; ESP32 GPIO 23 drops LOW immediately. | Buzzer silences; status returns to `Inactive`. Alert modal closes. |
| **TEST 6** | **Arming Security Mode** | 1. On Dashboard, tap `ARM SYSTEM`. | ESP32 receives `ARM` command, chirps once for confirmation, and enables tripwires. | Hero card turns deep blue: `SYSTEM ARMED` with green checkmark. |
| **TEST 7** | **Disarming Security Mode** | 1. Tap `DISARM SYSTEM`. | ESP32 receives `DISARM` command, chirps twice, and disables automatic alarm triggering. | Hero card turns dark slate: `SYSTEM DISARMED`. Motion events report as telemetry without sounding siren. |
| **TEST 8** | **Real-Time Telemetry Stream** | 1. Navigate to `Sensors` tab.<br>2. Rotate the breadboard along X, Y, Z axes. | ESP32 streams 1 Hz I2C telemetry packets over MQTT. | Live 3-Axis Accel and Gyro gauges update in real-time ($A_x, A_y, A_z$ in g, $G_x, G_y, G_z$ in °/s). |
| **TEST 9** | **Live GPS Geolocation** | 1. Place NEO-6M antenna near window until red PPS LED blinks.<br>2. Navigate to `GPS Live` tab. | GPS module acquires 3D satellite lock; ESP32 parses NMEA sentences. | Leaflet map displays precise blue radar marker at device location with satellite count ($N \ge 4$). |
| **TEST 10** | **Disconnection Detection** | 1. Unplug ESP32 or disable router Wi-Fi. | MQTT broker detects TCP drop or heartbeat watchdog timeout after 15s. | Dashboard updates badge to `ESP32 OFFLINE ✕` and logs disconnection in audit history. |
| **TEST 11** | **Automatic Reconnection** | 1. Re-plug ESP32 USB cable. | ESP32 auto-reconnect state machine re-establishes Wi-Fi and MQTT. | App automatically flips back to `ESP32 ONLINE ✓` within 2–5 seconds without page reload. |
| **TEST 12** | **State & History Persistence** | 1. Trigger a few alerts and disarm.<br>2. Hard-refresh browser / restart server. | SQLite database preserves all registered devices, settings, alerts, and audit logs. | Configured device ID, threshold slider value, and historical log entries reload instantly. |
