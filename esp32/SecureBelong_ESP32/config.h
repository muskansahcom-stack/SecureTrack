#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==========================================
// 1. DEVICE IDENTIFICATION
// ==========================================
#define DEVICE_ID           "ESP32-SECURITY-001"
#define FIRMWARE_VERSION    "v1.0.0-PRO"

// ==========================================
// 2. WI-FI CONFIGURATION (Dual Network Failover)
// Primary (Home/Lab Wi-Fi) & Secondary (Phone Personal Hotspot)
// ==========================================
#define WIFI_SSID           "Your_WiFi_SSID"       // Enter your Wi-Fi or Hotspot Name
#define WIFI_PASSWORD       "Your_WiFi_Password"   // Enter your Wi-Fi or Hotspot Password

#define WIFI_SSID_BACKUP    "Your_Phone_Hotspot"   // Optional phone hotspot fallback
#define WIFI_PASSWORD_BACKUP "Hotspot_Password"

// ==========================================
// 3. MQTT BROKER CONFIGURATION
// Machine IP running SECUREBELONG Gateway (:1883)
// ==========================================
#define MQTT_SERVER         "10.10.26.64"          // Current Local IP of this machine
#define MQTT_PORT           1883
#define MQTT_USER           ""                     // Leave empty if no auth
#define MQTT_PASSWORD       ""
#define DEFAULT_SILENT_MODE false                  // False = Audible buzzer, True = Covert silent tracking

// MQTT TOPICS
#define TOPIC_TELEMETRY     "iot/security/" DEVICE_ID "/telemetry"
#define TOPIC_ALERTS        "iot/security/" DEVICE_ID "/alerts"
#define TOPIC_STATUS        "iot/security/" DEVICE_ID "/status"
#define TOPIC_HEARTBEAT     "iot/security/" DEVICE_ID "/heartbeat"
#define TOPIC_COMMAND       "iot/security/" DEVICE_ID "/command"
#define TOPIC_ACK           "iot/security/" DEVICE_ID "/ack"

// ==========================================
// 4. HARDWARE PIN DEFINITIONS (ESP32 DevKit V1)
// ==========================================
// MPU6050 GY-521 (I2C)
#define PIN_MPU_SDA         21  // ESP32 GPIO 21 -> MPU6050 SDA
#define PIN_MPU_SCL         22  // ESP32 GPIO 22 -> MPU6050 SCL

// HC-SR501 PIR Sensor (Digital Input)
#define PIN_PIR             13  // ESP32 GPIO 13 -> HC-SR501 OUT

// 5V Active Buzzer (Digital Output)
#define PIN_BUZZER          23  // ESP32 GPIO 23 -> Buzzer Positive (+)

// NEO-6M GPS (Hardware Serial 2)
#define PIN_GPS_RX          16  // ESP32 GPIO 16 (RX2) -> NEO-6M TX
#define PIN_GPS_TX          17  // ESP32 GPIO 17 (TX2) -> NEO-6M RX
#define GPS_BAUD_RATE       9600

// Built-in LED for visual status indication
#define PIN_STATUS_LED      2

// ==========================================
// 5. OPERATIONAL THRESHOLDS & TIMINGS
// ==========================================
#define DEFAULT_MOVEMENT_THRESHOLD    0.30f  // Movement threshold in 'g' (delta from 1.0g)
#define TELEMETRY_INTERVAL_MS         1000   // Send sensor updates every 1 second
#define HEARTBEAT_INTERVAL_MS         5000   // Heartbeat ping every 5 seconds
#define PIR_COOLDOWN_MS               3000   // Prevent alert spam from repeated PIR triggers
#define MPU_COOLDOWN_MS               3000   // Prevent alert spam from continuous motion
#define DEFAULT_ALARM_DURATION_MS     15000  // Buzzer automatic shutoff after 15s

#endif // CONFIG_H
