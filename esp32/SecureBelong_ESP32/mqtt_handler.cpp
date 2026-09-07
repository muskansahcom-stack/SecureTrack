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

  Serial.println("[WiFi] Connecting via WiFiMulti (Home AP + Mobile Hotspot failover)...");
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  #ifdef WIFI_SSID_BACKUP
  if (strlen(WIFI_SSID_BACKUP) > 0) {
    wifiMulti.addAP(WIFI_SSID_BACKUP, WIFI_PASSWORD_BACKUP);
  }
  #endif

  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] Connected to: %s | IP: %s | RSSI: %d dBm\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n[WiFi] Connection searching. Will retry in background...");
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
    Serial.printf("[MQTT] Attempting connection to broker %s:%d...\n", MQTT_SERVER, MQTT_PORT);

    StaticJsonDocument<128> lwtDoc;
    lwtDoc["is_online"] = 0;
    lwtDoc["status"] = "OFFLINE";
    char lwtBuffer[128];
    serializeJson(lwtDoc, lwtBuffer);

    String clientId = String(DEVICE_ID);
    bool connected = false;

    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, TOPIC_STATUS, 1, true, lwtBuffer);
    } else {
      connected = mqttClient.connect(clientId.c_str(), TOPIC_STATUS, 1, true, lwtBuffer);
    }

    if (connected) {
      Serial.println("[MQTT] Broker connected successfully!");
      digitalWrite(PIN_STATUS_LED, HIGH);

      mqttClient.subscribe(TOPIC_COMMAND, 1);
      Serial.printf("[MQTT] Subscribed to topic: %s\n", TOPIC_COMMAND);

      sendStatus(systemArmed, WiFi.localIP().toString());
    } else {
      Serial.printf("[MQTT] Connection failed, rc=%d. Retrying in 5 seconds...\n", mqttClient.state());
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

  Serial.printf("[MQTT Callback] Message arrived on [%s]: %s\n", topic, message);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.printf("[MQTT Callback] JSON parse error: %s\n", error.c_str());
    return;
  }

  const char* cmd = doc["command"];
  if (!cmd) return;

  JsonObject params = doc["params"].as<JsonObject>();
  instance->handleCommand(String(cmd), params);
}

void MQTTManager::handleCommand(const String& command, JsonObject& params) {
  Serial.printf("[MQTT Command Received] -> %s\n", command.c_str());

  // 1. AREA SECURITY COMMANDS (HC-SR501 PIR)
  if (command == "AREA_SECURITY_ON") {
    areaSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("AREA_SECURITY_ON", true, "Area Security armed (PIR active)");
    Serial.println("[Security Mode] -> AREA SECURITY ACTIVE (PIR)");
  } else if (command == "AREA_SECURITY_OFF") {
    areaSecurityEnabled = false;
    systemArmed = belongingSecurityEnabled;
    buzzer.triggerAlarm(ALARM_CHIRP_DISARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("AREA_SECURITY_OFF", true, "Area Security disarmed");
    Serial.println("[Security Mode] -> AREA SECURITY DISABLED");
  }

  // 2. PERSONAL BELONGING SECURITY COMMANDS (MPU6050)
  else if (command == "BELONGING_SECURITY_ON") {
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("BELONGING_SECURITY_ON", true, "Personal Belonging Security armed (MPU6050 active)");
    Serial.println("[Security Mode] -> PERSONAL BELONGING ACTIVE (MPU6050)");
  } else if (command == "BELONGING_SECURITY_OFF") {
    belongingSecurityEnabled = false;
    systemArmed = areaSecurityEnabled;
    buzzer.triggerAlarm(ALARM_CHIRP_DISARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("BELONGING_SECURITY_OFF", true, "Personal Belonging Security disarmed");
    Serial.println("[Security Mode] -> PERSONAL BELONGING DISABLED");
  }

  // 3. 4 PRESET SECURITY MODES
  else if (command == "SET_MODE_HOME") {
    areaSecurityEnabled = true;
    belongingSecurityEnabled = false;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("SET_MODE_HOME", true, "Mode: HOME (Area ON, Belonging OFF)");
  } else if (command == "SET_MODE_AWAY") {
    areaSecurityEnabled = true;
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("SET_MODE_AWAY", true, "Mode: AWAY (Area ON, Belonging ON)");
  } else if (command == "SET_MODE_TRAVEL") {
    areaSecurityEnabled = false;
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("SET_MODE_TRAVEL", true, "Mode: TRAVEL (Belonging ON, GPS ON)");
  } else if (command == "SET_MODE_EMERGENCY") {
    areaSecurityEnabled = true;
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CONTINUOUS);
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("SET_MODE_EMERGENCY", true, "Mode: EMERGENCY (Maximum Alarm & GPS Active)");
  }

  // 4. MASTER ARM / DISARM
  else if (command == "ARM") {
    areaSecurityEnabled = true;
    belongingSecurityEnabled = true;
    systemArmed = true;
    buzzer.triggerAlarm(ALARM_CHIRP_ARM);
    sendStatus(true, WiFi.localIP().toString());
    sendAck("ARM", true, "System successfully armed");
    Serial.println("[Command] -> MASTER SYSTEM ARMED (Area + Belonging)");
  } else if (command == "DISARM") {
    areaSecurityEnabled = false;
    belongingSecurityEnabled = false;
    systemArmed = false;
    buzzer.stopAlarm();
    buzzer.triggerAlarm(ALARM_CHIRP_DISARM);
    sendStatus(false, WiFi.localIP().toString());
    sendAck("DISARM", true, "System successfully disarmed");
    Serial.println("[Command] -> MASTER SYSTEM DISARMED");
  }

  // 5. PHYSICAL BUZZER CONTROLS
  else if (command == "BUZZER_ON") {
    buzzer.triggerAlarm(ALARM_CONTINUOUS);
    sendAck("BUZZER_ON", true, "Buzzer siren activated");
    Serial.println("[Command] -> BUZZER ON");
  } else if (command == "BUZZER_OFF") {
    buzzer.stopAlarm();
    sendAck("BUZZER_OFF", true, "Buzzer stopped");
    Serial.println("[Command] -> BUZZER OFF");
  }

  // 6. GPS & SETTINGS
  else if (command == "REQUEST_GPS") {
    GPSData currentGps = gps.getData();
    sendAck("REQUEST_GPS", true, currentGps.is_valid ? "GPS Locked" : "GPS Searching");
    Serial.println("[Command] -> GPS UPDATE REQUESTED");
  } else if (command == "SET_SILENT_MODE") {
    if (params.containsKey("silent_mode")) {
      silentMode = (params["silent_mode"].as<int>() == 1);
    } else {
      silentMode = !silentMode;
    }
    sendAck("SET_SILENT_MODE", true, silentMode ? "Covert Silent Mode ENABLED" : "Audible Siren Mode ENABLED");
    Serial.printf("[Command] -> COVERT SILENT MODE: %s\n", silentMode ? "ON" : "OFF");
  } else if (command == "SET_THRESHOLD") {
    if (params.containsKey("threshold")) {
      float th = params["threshold"].as<float>();
      sensors.setMovementThreshold(th);
      sendAck("SET_THRESHOLD", true, "Movement threshold updated to " + String(th, 2) + "g");
    }
  } else if (command == "GET_STATUS") {
    sendStatus(systemArmed, WiFi.localIP().toString());
    sendAck("GET_STATUS", true, "Status broadcasted");
  } else if (command == "RESET_ALERT") {
    buzzer.stopAlarm();
    sendAck("RESET_ALERT", true, "Alert reset");
  } else if (command == "REBOOT") {
    sendAck("REBOOT", true, "ESP32 rebooting...");
    delay(500);
    ESP.restart();
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
  mpuObj["motion"] = mpu.motion_detected;

  JsonObject pirObj = doc.createNestedObject("pir");
  pirObj["motion"] = pir.motion_detected;
  pirObj["raw"] = pir.raw_value;

  JsonObject gpsObj = doc.createNestedObject("gps");
  if (gpsData.is_valid) {
    gpsObj["lat"] = serialized(String(gpsData.latitude, 6));
    gpsObj["lng"] = serialized(String(gpsData.longitude, 6));
  } else {
    gpsObj["lat"] = nullptr;
    gpsObj["lng"] = nullptr;
  }
  gpsObj["valid"] = gpsData.is_valid;
  gpsObj["sats"] = gpsData.satellites;
  gpsObj["alt"] = serialized(String(gpsData.altitude_m, 1));
  gpsObj["speed"] = serialized(String(gpsData.speed_kmh, 1));

  doc["buzzer"] = buzzerActive;
  doc["armed"] = armed;
  doc["area_security_enabled"] = areaSecurityEnabled;
  doc["belonging_security_enabled"] = belongingSecurityEnabled;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime_sec"] = millis() / 1000;

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_TELEMETRY, buffer);
}

void MQTTManager::sendAlert(const String& alertType, const String& title, const String& description, const String& severity, double lat, double lng) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["alert_type"] = alertType;
  doc["security_mode"] = (alertType == "INTRUSION") ? "AREA" : "BELONGING";
  doc["title"] = title;
  doc["description"] = description;
  doc["severity"] = severity;
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
  mqttClient.publish(TOPIC_ALERTS, buffer, true);
  Serial.printf("[Alert Published] %s -> %s\n", alertType.c_str(), title.c_str());
}

void MQTTManager::sendStatus(bool armed, const String& ip) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["is_online"] = 1;
  doc["armed"] = armed ? 1 : 0;
  doc["area_security"] = areaSecurityEnabled ? 1 : 0;
  doc["belonging_security"] = belongingSecurityEnabled ? 1 : 0;
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
  mqttClient.publish(TOPIC_HEARTBEAT, buffer);
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
  areaSecurityEnabled = armed;
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
