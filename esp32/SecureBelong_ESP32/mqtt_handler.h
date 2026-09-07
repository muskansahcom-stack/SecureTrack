#ifndef MQTT_HANDLER_H
#define MQTT_HANDLER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"
#include "gps_handler.h"
#include "buzzer.h"

typedef void (*CommandHandler)(const String& command, JsonObject& params);

class MQTTManager {
public:
  MQTTManager(SensorManager& sensors, GPSHandler& gps, BuzzerController& buzzer);
  void begin();
  void update();
  
  bool isConnected();
  void sendTelemetry(const MPUReadings& mpu, const PIRReadings& pir, const GPSData& gpsData, bool armed, bool buzzerActive);
  void sendAlert(const String& alertType, const String& title, const String& description, const String& severity, double lat, double lng);
  void sendStatus(bool armed, const String& ip);
  void sendHeartbeat();
  void sendAck(const String& command, bool success, const String& message);

  void setArmed(bool armed);
  bool isArmed() const;
  void setAreaSecurity(bool enabled);
  bool isAreaSecurityEnabled() const;
  void setBelongingSecurity(bool enabled);
  bool isBelongingSecurityEnabled() const;
  void setSilentMode(bool silent);
  bool isSilentMode() const;

private:
  WiFiClient wifiClient;
  WiFiMulti wifiMulti;
  PubSubClient mqttClient;
  SensorManager& sensors;
  GPSHandler& gps;
  BuzzerController& buzzer;

  bool systemArmed;
  bool areaSecurityEnabled;
  bool belongingSecurityEnabled;
  bool silentMode;
  unsigned long lastReconnectAttempt;
  unsigned long lastTelemetryTime;
  unsigned long lastHeartbeatTime;

  void connectWiFi();
  void connectMQTT();
  static void mqttCallback(char* topic, byte* payload, unsigned int length);
  void handleCommand(const String& command, JsonObject& params);
  
  static MQTTManager* instance;
};

#endif // MQTT_HANDLER_H
