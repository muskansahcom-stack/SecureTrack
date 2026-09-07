#include "gps_handler.h"

GPSHandler::GPSHandler()
  : gpsSerial(2),
    lastFeedTime(0),
    charactersReceived(false) {}

void GPSHandler::begin() {
  // Initialize ESP32 HardwareSerial 2 on configured RX/TX pins
  Serial.printf("[GPS] Initializing NEO-6M GPS on UART2 (RX=%d, TX=%d) at %d baud...\n",
                PIN_GPS_RX, PIN_GPS_TX, GPS_BAUD_RATE);
  gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
}

void GPSHandler::update() {
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
    charactersReceived = true;
    lastFeedTime = millis();
  }
}

GPSData GPSHandler::getData() {
  GPSData data;
  data.latitude = 0.0;
  data.longitude = 0.0;
  data.is_valid = false;
  data.satellites = 0;
  data.altitude_m = 0.0;
  data.speed_kmh = 0.0;
  data.age_ms = 0;
  data.is_connected = charactersReceived && (millis() - lastFeedTime < 5000);

  if (gps.location.isValid()) {
    data.latitude = gps.location.lat();
    data.longitude = gps.location.lng();
    data.is_valid = true;
    data.age_ms = gps.location.age();
  }

  if (gps.satellites.isValid()) {
    data.satellites = gps.satellites.value();
  }

  if (gps.altitude.isValid()) {
    data.altitude_m = gps.altitude.meters();
  }

  if (gps.speed.isValid()) {
    data.speed_kmh = gps.speed.kmph();
  }

  return data;
}
