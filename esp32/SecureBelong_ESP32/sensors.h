#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "config.h"

struct MPUReadings {
  float accel_x;
  float accel_y;
  float accel_z;
  float gyro_x;
  float gyro_y;
  float gyro_z;
  float magnitude;
  bool motion_detected;
  bool is_connected;
};

struct PIRReadings {
  bool motion_detected;
  int raw_value;
  bool is_enabled;
};

class SensorManager {
public:
  SensorManager();
  bool begin();
  MPUReadings readMPU();
  PIRReadings readPIR();
  
  void setMovementThreshold(float threshold);
  float getMovementThreshold() const;
  
  void setPIREnabled(bool enabled);
  bool isPIREnabled() const;
  
  void setMPUEnabled(bool enabled);
  bool isMPUEnabled() const;

private:
  Adafruit_MPU6050 mpu;
  bool mpuInitialized;
  float movementThreshold;
  bool pirEnabled;
  bool mpuEnabled;
  unsigned long lastPIRTriggerTime;
  unsigned long lastMPUTriggerTime;
};

#endif // SENSORS_H
