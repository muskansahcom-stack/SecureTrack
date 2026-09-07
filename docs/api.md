# SECUREBELONG: REST & WebSocket API Reference

Base URL: `http://localhost:5001/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Register a new operator.
```json
{
  "name": "Alex Mercer",
  "email": "alex@securebelong.local",
  "password": "password123"
}
```

### `POST /api/auth/login`
Authenticate and obtain JWT token.
```json
{
  "email": "alex@securebelong.local",
  "password": "password123"
}
```

### `GET /api/auth/me`
Header: `Authorization: Bearer <token>`
Returns the logged-in user profile.

---

## 2. Device Management Endpoints

### `POST /api/device/register`
Pair a new ESP32 device ID to the dashboard.
```json
{
  "device_id": "ESP32-SECURITY-001",
  "device_name": "Backpack Security Node",
  "user_id": "usr_default"
}
```

### `GET /api/device/:id/status`
Retrieve device online status, settings, and latest sensor telemetry.

### `GET /api/device/:id/telemetry`
Retrieve the latest raw sensor snapshot (MPU6050, PIR, GPS, Buzzer).

### `GET /api/device/:id/telemetry/history?limit=50`
Retrieve chronological sensor historical data.

### `POST /api/device/:id/command`
Dispatch a remote command over MQTT to the physical ESP32.
```json
{
  "command": "ARM"
}
```
Available commands: `ARM`, `DISARM`, `BUZZER_ON`, `BUZZER_OFF`, `SET_THRESHOLD`, `ENABLE_PIR`, `DISABLE_PIR`, `ENABLE_MPU`, `DISABLE_MPU`, `RESET_ALERT`, `REBOOT`.

### `GET /api/device/:id/settings`
Retrieve sensitivity thresholds and alarm configurations.

### `PUT /api/device/:id/settings`
Update sensitivity threshold and configurations.
```json
{
  "movement_threshold": 0.25,
  "pir_enabled": 1,
  "auto_buzzer": 1
}
```

---

## 3. Alerts & Events Endpoints

### `GET /api/alerts?deviceId=ESP32-SECURITY-001`
Retrieve active and unacknowledged security alerts.

### `POST /api/alerts/:id/ack`
Acknowledge an alert.

### `DELETE /api/alerts?deviceId=ESP32-SECURITY-001`
Clear alert queue.

### `GET /api/device/:id/events?limit=100&type=ALL`
Query historical audit log events stored in SQLite.

---

## 4. WebSocket Real-Time Events (Socket.io)

### Emitted from Server to Client:
- `device:telemetry`: Continuous 1 Hz telemetry stream (`mpu`, `pir`, `gps`, `buzzer`, `armed`).
- `device:alert`: Instant alert object when motion or perimeter intrusion is triggered.
- `device:status`: Online/Offline and Armed/Disarmed state updates.
- `device:command_ack`: ESP32 execution confirmation.
