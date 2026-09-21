#include "mqtt_handler.h"

MQTTManager* MQTTManager::instance = nullptr;

MQTTManager::MQTTManager(SensorManager& sensors, GPSHandler& gps, BuzzerController& buzzer)
  : mqttClient(wifiClient),
    sensors(sensors),
    gps(gps),
    buzzer(buzzer),
    systemArmed(false),
    areaSecurityEnabled(false),
    belongingSecurityEnabled(false),
    silentMode(DEFAULT_SILENT_MODE),
    lastReconnectAttempt(0),
    lastTelemetryTime(0),
    lastHeartbeatTime(0) {
  instance = this;
}

void MQTTManager::begin() {
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  connectWiFi();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(MQTTManager::mqttCallback);
  mqttClient.setBufferSize(1024);
}

void MQTTManager::connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("[WiFi] Connecting via WiFiMulti...");
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  #ifdef WIFI_SSID_BACKUP
  if (strlen(WIFI_SSID_BACKUP) > 0) {
    wifiMulti.addAP(WIFI_SSID_BACKUP, WIFI_PASSWORD_BACKUP);
  }
  #endif

  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 10) {
    delay(400);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] SSID: %s | IP: %s | RSSI: %d dBm\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n[WiFi] Offline. Operating in standalone local protection mode.");
    digitalWrite(PIN_STATUS_LED, LOW);
  }
}

void MQTTManager::connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastReconnectAttempt > 5000) {
    lastReconnectAttempt = now;
    Serial.printf("[MQTT] Connecting to broker %s:%d...\n", MQTT_SERVER, MQTT_PORT);

    StaticJsonDocument<128> lwtDoc;
    lwtDoc["device_id"] = DEVICE_ID;
    lwtDoc["status"] = "OFFLINE";
    lwtDoc["is_online"] = 0;
    char lwtBuffer[128];
    serializeJson(lwtDoc, lwtBuffer);

    String clientId = String(DEVICE_ID) + "_" + String(random(1000, 9999));
    bool connected = false;

    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, TOPIC_STATUS, 1, true, lwtBuffer);
    } else {
      connected = mqttClient.connect(clientId.c_str(), TOPIC_STATUS, 1, true, lwtBuffer);
    }

    if (connected) {
      Serial.println("[MQTT] Connected to SecureBelong Gateway!");
      digitalWrite(PIN_STATUS_LED, HIGH);

      mqttClient.subscribe(TOPIC_COMMANDS, 1);
      mqttClient.subscribe(TOPIC_LEGACY_CMD, 1);
      Serial.printf("[MQTT] Subscribed to: %s\n", TOPIC_COMMANDS);

      sendStatus(systemArmed, WiFi.localIP().toString());
    } else {
      Serial.printf("[MQTT] Failed, rc=%d. Retrying in background...\n", mqttClient.state());
      digitalWrite(PIN_STATUS_LED, LOW);
    }
  }
}

void MQTTManager::update() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  } else {
    mqttClient.loop();
  }
}

bool MQTTManager::isConnected() {
  return mqttClient.connected();
}

void MQTTManager::mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (!instance) return;

  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.printf("[MQTT] Command on [%s]: %s\n", topic, message);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
    return;
  }

  const char* cmd = doc["command"];
  if (!cmd) return;

  JsonObject params = doc["params"].as<JsonObject>();
  instance->handleCommand(String(cmd), params);
}

void MQTTManager::handleCommand(const String& command, JsonObject& params) {
  Serial.printf("[Security Command] -> %s\n", command.c_str());

  // 1. ARM PROTECTION (Personal Belonging / Laptop)
  if (command == "ARM" || command == "ARM_PROTECTION" || command == "BELONGING_SECURITY_ON") {
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck(command, true, "Personal belonging protection ARMED (MPU6050 active)");
    Serial.println("[Protection] -> ARMED (MPU6050 Active)");
  } 
  // 2. DISARM PROTECTION
  else if (command == "DISARM" || command == "DISARM_PROTECTION" || command == "BELONGING_SECURITY_OFF") {
    belongingSecurityEnabled = false;
    areaSecurityEnabled = false;
    systemArmed = false;
    buzzer.stopAlarm();
    buzzer.triggerAlarm(ALARM_CHIRP_DISARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck(command, true, "Protection DISARMED");
    Serial.println("[Protection] -> DISARMED");
  }
  // 3. STOP SIREN
  else if (command == "STOP_SIREN" || command == "BUZZER_OFF" || command == "RESET_ALERT") {
    buzzer.stopAlarm();
    sendAck(command, true, "Siren and buzzer stopped");
    Serial.println("[Buzzer] -> STOPPED");
  }
  // 4. AREA SECURITY TOGGLES
  else if (command == "AREA_SECURITY_ON") {
    areaSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("AREA_SECURITY_ON", true, "Area security ARMED (PIR active)");
  } else if (command == "AREA_SECURITY_OFF") {
    areaSecurityEnabled = false;
    systemArmed = belongingSecurityEnabled;
    buzzer.triggerAlarm(ALARM_CHIRP_DISARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("AREA_SECURITY_OFF", true, "Area security DISARMED");
  }
  // 5. STATUS & SENSORS CONFIG
  else if (command == "REQUEST_STATUS" || command == "GET_STATUS") {
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck(command, true, "Status broadcasted");
  } else if (command == "SET_CONFIG") {
    if (params.containsKey("threshold")) {
      float th = params["threshold"].as<float>();
      sensors.setMovementThreshold(th);
    }
    if (params.containsKey("silent_mode")) {
      silentMode = (params["silent_mode"].as<int>() == 1);
    }
    sendAck("SET_CONFIG", true, "Configuration updated");
  } else {
    sendAck(command, false, "Unknown command");
  }
}

void MQTTManager::sendTelemetry(const MPUReadings& mpu, const PIRReadings& pir, const GPSData& gpsData, bool armed, bool buzzerActive) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();

  JsonObject mpuObj = doc.createNestedObject("mpu");
  mpuObj["accel_x"] = serialized(String(mpu.accel_x, 3));
  mpuObj["accel_y"] = serialized(String(mpu.accel_y, 3));
  mpuObj["accel_z"] = serialized(String(mpu.accel_z, 3));
  mpuObj["gyro_x"] = serialized(String(mpu.gyro_x, 2));
  mpuObj["gyro_y"] = serialized(String(mpu.gyro_y, 2));
  mpuObj["gyro_z"] = serialized(String(mpu.gyro_z, 2));
  mpuObj["magnitude"] = serialized(String(mpu.magnitude, 3));
  mpuObj["motion_detected"] = mpu.motion_detected;

  JsonObject pirObj = doc.createNestedObject("pir");
  pirObj["motion"] = pir.motion_detected;
  pirObj["raw_val"] = pir.raw_value;

  JsonObject gpsObj = doc.createNestedObject("gps");
  if (gpsData.is_valid) {
    gpsObj["latitude"] = serialized(String(gpsData.latitude, 6));
    gpsObj["longitude"] = serialized(String(gpsData.longitude, 6));
  } else {
    gpsObj["latitude"] = nullptr;
    gpsObj["longitude"] = nullptr;
  }
  gpsObj["valid"] = gpsData.is_valid;
  gpsObj["satellites"] = gpsData.satellites;
  gpsObj["altitude"] = serialized(String(gpsData.altitude_m, 1));
  gpsObj["speed"] = serialized(String(gpsData.speed_kmh, 1));

  doc["buzzer_active"] = buzzerActive;
  doc["system_armed"] = armed;
  doc["belonging_security_enabled"] = belongingSecurityEnabled;
  doc["area_security_enabled"] = areaSecurityEnabled;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime_sec"] = millis() / 1000;
  doc["battery"] = 100.0;

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_TELEMETRY, buffer);
}

void MQTTManager::sendAlert(const String& alertType, const String& title, const String& description, const String& severity, double lat, double lng) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["event_type"] = alertType;
  doc["alert_type"] = alertType;
  doc["title"] = title;
  doc["message"] = description;
  doc["description"] = description;
  doc["severity"] = severity;
  doc["alarm_status"] = "ACTIVE";
  doc["timestamp"] = millis();
  if (lat != 0.0 && lng != 0.0) {
    doc["latitude"] = serialized(String(lat, 6));
    doc["longitude"] = serialized(String(lng, 6));
  } else {
    doc["latitude"] = nullptr;
    doc["longitude"] = nullptr;
  }

  char buffer[384];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_EVENTS, buffer, true);
  Serial.printf("[Event Published] %s -> %s\n", alertType.c_str(), title.c_str());
}

void MQTTManager::sendStatus(bool armed, const String& ip) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["status"] = "ONLINE";
  doc["is_online"] = 1;
  doc["armed"] = armed ? 1 : 0;
  doc["belonging_security_enabled"] = belongingSecurityEnabled ? 1 : 0;
  doc["area_security_enabled"] = areaSecurityEnabled ? 1 : 0;
  doc["ip"] = ip;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["fw_ver"] = FIRMWARE_VERSION;

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer, true);
}

void MQTTManager::sendHeartbeat() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["device_id"] = DEVICE_ID;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_sec"] = millis() / 1000;

  char buffer[128];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer);
}

void MQTTManager::sendAck(const String& command, bool success, const String& message) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["command"] = command;
  doc["success"] = success;
  doc["message"] = message;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ACK, buffer);
}

void MQTTManager::setArmed(bool armed) {
  systemArmed = armed;
  belongingSecurityEnabled = armed;
}

bool MQTTManager::isArmed() const {
  return systemArmed;
}

void MQTTManager::setAreaSecurity(bool enabled) {
  areaSecurityEnabled = enabled;
  systemArmed = areaSecurityEnabled || belongingSecurityEnabled;
}

bool MQTTManager::isAreaSecurityEnabled() const {
  return areaSecurityEnabled;
}

void MQTTManager::setBelongingSecurity(bool enabled) {
  belongingSecurityEnabled = enabled;
  systemArmed = areaSecurityEnabled || belongingSecurityEnabled;
}

bool MQTTManager::isBelongingSecurityEnabled() const {
  return belongingSecurityEnabled;
}

void MQTTManager::setSilentMode(bool silent) {
  silentMode = silent;
}

bool MQTTManager::isSilentMode() const {
  return silentMode;
}
