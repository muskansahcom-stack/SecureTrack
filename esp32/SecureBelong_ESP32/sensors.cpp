#include "sensors.h"
#include <math.h>

SensorManager::SensorManager()
  : mpuInitialized(false),
    movementThreshold(DEFAULT_MOVEMENT_THRESHOLD),
    pirEnabled(true),
    mpuEnabled(true),
    lastPIRTriggerTime(0),
    lastMPUTriggerTime(0) {}

bool SensorManager::begin() {
  // Initialize I2C bus on GPIO21 (SDA) and GPIO22 (SCL)
  Wire.begin(PIN_MPU_SDA, PIN_MPU_SCL, 400000);

  // Initialize PIR pin
  pinMode(PIN_PIR, INPUT_PULLDOWN);

  // Initialize MPU6050
  Serial.println("[Sensors] Initializing MPU6050 GY-521...");
  if (!mpu.begin(0x68, &Wire)) {
    Serial.println("[Sensors] WARNING: MPU6050 not detected at default I2C address 0x68. Checking 0x69...");
    if (!mpu.begin(0x69, &Wire)) {
      Serial.println("[Sensors] ERROR: MPU6050 GY-521 initialization failed! Check I2C wiring (SDA->21, SCL->22).");
      mpuInitialized = false;
    } else {
      mpuInitialized = true;
    }
  } else {
    mpuInitialized = true;
  }

  if (mpuInitialized) {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[Sensors] MPU6050 configured successfully.");
  }

  return mpuInitialized;
}

MPUReadings SensorManager::readMPU() {
  MPUReadings data;
  data.accel_x = 0.0f;
  data.accel_y = 0.0f;
  data.accel_z = 0.0f;
  data.gyro_x = 0.0f;
  data.gyro_y = 0.0f;
  data.gyro_z = 0.0f;
  data.magnitude = 0.0f;
  data.motion_detected = false;
  data.is_connected = mpuInitialized;

  if (!mpuInitialized || !mpuEnabled) {
    return data;
  }

  sensors_event_t a, g, temp;
  if (!mpu.getEvent(&a, &g, &temp)) {
    Serial.println("[Sensors] Error reading MPU6050 events.");
    return data;
  }

  // Convert m/s^2 to g (1g ≈ 9.80665 m/s^2)
  data.accel_x = a.acceleration.x / 9.80665f;
  data.accel_y = a.acceleration.y / 9.80665f;
  data.accel_z = a.acceleration.z / 9.80665f;

  // Convert rad/s to deg/s
  data.gyro_x = g.gyro.x * 57.29578f;
  data.gyro_y = g.gyro.y * 57.29578f;
  data.gyro_z = g.gyro.z * 57.29578f;

  // Total acceleration magnitude vector
  float totalAccel = sqrtf(data.accel_x * data.accel_x +
                           data.accel_y * data.accel_y +
                           data.accel_z * data.accel_z);

  // Delta from static gravity (1.0g)
  data.magnitude = fabsf(totalAccel - 1.0f);

  // Check threshold and debounce
  if (data.magnitude > movementThreshold) {
    unsigned long now = millis();
    if (now - lastMPUTriggerTime >= MPU_COOLDOWN_MS) {
      data.motion_detected = true;
      lastMPUTriggerTime = now;
    }
  }

  return data;
}

PIRReadings SensorManager::readPIR() {
  PIRReadings data;
  data.is_enabled = pirEnabled;
  data.motion_detected = false;
  data.raw_value = 0;

  if (!pirEnabled) {
    return data;
  }

  data.raw_value = digitalRead(PIN_PIR);
  if (data.raw_value == HIGH) {
    unsigned long now = millis();
    if (now - lastPIRTriggerTime >= PIR_COOLDOWN_MS) {
      data.motion_detected = true;
      lastPIRTriggerTime = now;
    }
  }

  return data;
}

void SensorManager::setMovementThreshold(float threshold) {
  if (threshold > 0.05f && threshold < 5.0f) {
    movementThreshold = threshold;
    Serial.printf("[Sensors] Updated movement threshold to: %.2fg\n", movementThreshold);
  }
}

float SensorManager::getMovementThreshold() const {
  return movementThreshold;
}

void SensorManager::setPIREnabled(bool enabled) {
  pirEnabled = enabled;
  Serial.printf("[Sensors] PIR monitoring %s\n", enabled ? "ENABLED" : "DISABLED");
}

bool SensorManager::isPIREnabled() const {
  return pirEnabled;
}

void SensorManager::setMPUEnabled(bool enabled) {
  mpuEnabled = enabled;
  Serial.printf("[Sensors] MPU6050 monitoring %s\n", enabled ? "ENABLED" : "DISABLED");
}

bool SensorManager::isMPUEnabled() const {
  return mpuEnabled;
}
