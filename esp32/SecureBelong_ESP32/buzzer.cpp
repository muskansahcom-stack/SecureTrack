#include "buzzer.h"

BuzzerController::BuzzerController()
  : currentPattern(ALARM_OFF),
    buzzerState(false),
    patternStartTime(0),
    durationLimitMs(0),
    lastToggleTime(0),
    patternStep(0) {}

void BuzzerController::begin() {
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  buzzerState = false;
}

void BuzzerController::triggerAlarm(AlarmPattern pattern, unsigned long durationMs) {
  currentPattern = pattern;
  patternStartTime = millis();
  durationLimitMs = durationMs;
  lastToggleTime = millis();
  patternStep = 0;

  if (pattern == ALARM_CONTINUOUS) {
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerState = true;
  } else if (pattern == ALARM_OFF) {
    stopAlarm();
  }
}

void BuzzerController::stopAlarm() {
  currentPattern = ALARM_OFF;
  digitalWrite(PIN_BUZZER, LOW);
  buzzerState = false;
  patternStep = 0;
}

bool BuzzerController::isActive() const {
  return currentPattern != ALARM_OFF;
}

AlarmPattern BuzzerController::getCurrentPattern() const {
  return currentPattern;
}

void BuzzerController::update() {
  if (currentPattern == ALARM_OFF) {
    return;
  }

  unsigned long now = millis();

  // Check overall timeout duration
  if (durationLimitMs > 0 && (now - patternStartTime >= durationLimitMs)) {
    Serial.println("[Buzzer] Alarm timeout reached. Stopping buzzer.");
    stopAlarm();
    return;
  }

  // Handle patterns non-blockingly
  switch (currentPattern) {
    case ALARM_CONTINUOUS:
      // Always ON until stopped
      break;

    case ALARM_INTRUSION_SIREN: {
      // High-power rapid distress siren: 70ms ON, 30ms OFF (10 pulses/sec)
      unsigned long elapsed = now - lastToggleTime;
      if (buzzerState && elapsed >= 70) {
        digitalWrite(PIN_BUZZER, LOW);
        buzzerState = false;
        lastToggleTime = now;
      } else if (!buzzerState && elapsed >= 30) {
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerState = true;
        lastToggleTime = now;
      }
      break;
    }

    case ALARM_MOVEMENT_PULSE: {
      // High-power belonging movement pulse: 150ms ON, 50ms OFF
      unsigned long elapsed = now - lastToggleTime;
      if (buzzerState && elapsed >= 150) {
        digitalWrite(PIN_BUZZER, LOW);
        buzzerState = false;
        lastToggleTime = now;
      } else if (!buzzerState && elapsed >= 50) {
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerState = true;
        lastToggleTime = now;
      }
      break;
    }

    case ALARM_CHIRP_ARM: {
      // Single 150ms beep then off
      unsigned long elapsed = now - patternStartTime;
      if (elapsed < 150) {
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerState = true;
      } else {
        stopAlarm();
      }
      break;
    }

    case ALARM_CHIRP_DISARM: {
      // Two 80ms beeps separated by 80ms
      unsigned long elapsed = now - patternStartTime;
      if (elapsed < 80) {
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerState = true;
      } else if (elapsed < 160) {
        digitalWrite(PIN_BUZZER, LOW);
        buzzerState = false;
      } else if (elapsed < 240) {
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerState = true;
      } else {
        stopAlarm();
      }
      break;
    }

    default:
      stopAlarm();
      break;
  }
}
