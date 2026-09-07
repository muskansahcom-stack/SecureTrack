#ifndef GPS_HANDLER_H
#define GPS_HANDLER_H

#include <Arduino.h>
#include <TinyGPSPlus.h>
#include "config.h"

struct GPSData {
  double latitude;
  double longitude;
  bool is_valid;
  int satellites;
  double altitude_m;
  double speed_kmh;
  unsigned long age_ms;
  bool is_connected;
};

class GPSHandler {
public:
  GPSHandler();
  void begin();
  void update();
  GPSData getData();

private:
  TinyGPSPlus gps;
  HardwareSerial gpsSerial;
  unsigned long lastFeedTime;
  bool charactersReceived;
};

#endif // GPS_HANDLER_H
