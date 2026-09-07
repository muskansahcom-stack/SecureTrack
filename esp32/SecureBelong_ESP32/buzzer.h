#ifndef BUZZER_H
#define BUZZER_H

#include <Arduino.h>
#include "config.h"

enum AlarmPattern {
  ALARM_OFF,
  ALARM_CONTINUOUS,
  ALARM_INTRUSION_SIREN,    // Fast beep pattern
  ALARM_MOVEMENT_PULSE,     // Dual chirp
  ALARM_CHIRP_ARM,          // Single short beep
  ALARM_CHIRP_DISARM        // Double short beep
};

class BuzzerController {
public:
  BuzzerController();
  void begin();
  void update();
  
  void triggerAlarm(AlarmPattern pattern, unsigned long durationMs = DEFAULT_ALARM_DURATION_MS);
  void stopAlarm();
  bool isActive() const;
  AlarmPattern getCurrentPattern() const;

private:
  AlarmPattern currentPattern;
  bool buzzerState;
  unsigned long patternStartTime;
  unsigned long durationLimitMs;
  unsigned long lastToggleTime;
  int patternStep;
};

#endif // BUZZER_H
