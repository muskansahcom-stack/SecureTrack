# SECUREBELONG: IoT-Based Personal Belonging & Area Security System

**SECUREBELONG** is a production-grade, real-time IoT security application engineered to protect physical personal belongings (e.g. backpacks, luggage, safes, equipment) and secure area perimeters using an **ESP32 microcontroller**, **MPU6050 6-DOF IMU**, **HC-SR501 PIR sensor**, **NEO-6M GPS module**, and **5V Active Buzzer** linked via two-way **MQTT/WebSocket communication** to a responsive mobile-first dashboard.

---

## 1. Problem Statement & Objective

Traditional portable security systems either lack real-time perimeter tripwires or fail to provide instant remote deterrence and location tracking. SECUREBELONG solves this by unifying:
1. **Belonging Vibration & Movement Detection** (detecting if protected luggage/equipment is displaced or tampered with using MPU6050 vector calculus).
2. **Perimeter Intrusion Detection** (detecting unauthorized human presence within a 3–7m radius using HC-SR501 PIR).
3. **Satellite Geolocation** (tracking physical position using NEO-6M GPS).
4. **Physical Deterrence & Remote Control** (activating/silencing a physical active buzzer directly from a mobile web app).
5. **Zero Cloud Lock-in** (featuring an embedded zero-configuration MQTT broker for direct local/remote connectivity).

---

## 2. System Architecture

```
Physical ESP32 Node (MPU6050 + PIR + GPS + Buzzer)
       ↓ (Wi-Fi / TCP)
Embedded Aedes MQTT Broker (:1883) & Express REST API (:5001)
       ↓ (Socket.io Real-Time Stream / REST)
SECUREBELONG Mobile App (Leaflet Map + React + Tailwind)
```

---

## 3. Hardware Bill of Materials & Pin Configuration

| Component | ESP32 DevKit V1 Pin | Protocol / Signal | Logic Voltage | Function |
|---|---|---|---|---|
| **MPU6050 GY-521** | `SDA (GPIO 21)`<br>`SCL (GPIO 22)`<br>`VCC (3V3)`<br>`GND (GND)` | I2C (`0x68`) | 3.3V | Belonging displacement & tilt detection |
| **HC-SR501 PIR** | `OUT (GPIO 13)`<br>`VCC (VIN 5V)`<br>`GND (GND)` | Digital Input | 3.3V Logic | Area perimeter infrared intrusion trigger |
| **NEO-6M GPS** | `TX → GPIO 16 (RX2)`<br>`RX → GPIO 17 (TX2)`<br>`VCC (VIN 5V)`<br>`GND (GND)` | HardwareSerial2 (9600 baud) | 3.3V Logic | Real-time latitude, longitude, and satellite telemetry |
| **5V Active Buzzer** | `Positive → GPIO 23`<br>`Negative → GND` | Digital Output | 3.3V / 5V | Audible deterrent siren & arming chirps |

---

## 4. Project Structure

```
NexRiser/
├── backend/
│   ├── src/
│   │   ├── config/             # Server & MQTT configuration
│   │   ├── database/           # SQLite database engine (node:sqlite)
│   │   ├── mqtt/               # Embedded Aedes broker & client dispatcher
│   │   ├── routes/             # REST routes (auth, device, alerts, health)
│   │   ├── services/           # Heartbeat watchdog & alert logic
│   │   ├── websocket/          # Socket.io real-time streaming
│   │   └── server.ts           # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios REST client
│   │   ├── components/         # Navbar, BottomNav, AlertBanner, TestModeBanner
│   │   ├── context/            # AuthContext, DeviceContext (Audio synthesizer & WebSocket)
│   │   ├── screens/            # Splash, Auth, Setup, Dashboard, Sensors, Map, Alerts, Health, Settings
│   │   ├── types/              # Shared TypeScript definitions
│   │   ├── App.tsx             # Root application orchestrator
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── esp32/
│   ├── SecureBelong_ESP32/
│   │   ├── SecureBelong_ESP32.ino # Main Arduino firmware
│   │   ├── config.h               # Wi-Fi credentials & GPIO pins
│   │   ├── sensors.h / .cpp       # MPU6050 vector math & PIR
│   │   ├── gps_handler.h / .cpp   # NEO-6M NMEA parser
│   │   ├── buzzer.h / .cpp        # Siren rhythm controller
│   │   └── mqtt_handler.h / .cpp  # PubSubClient topics & auto-reconnect
│   └── simulator.js               # Interactive CLI hardware test simulator
├── docs/
│   ├── architecture.md
│   ├── wiring.md
│   ├── setup.md
│   ├── api.md
│   └── testing.md
└── README.md
```

---

## 5. Quick Start Instructions

### Step 1: Start Backend & Embedded MQTT Broker
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5001` and embedded MQTT broker listens on `0.0.0.0:1883`.*

### Step 2: Start Mobile Application
```bash
cd frontend
npm install
npm run dev
```
*Access the mobile UI at `http://localhost:5173` or on your mobile device at `http://<YOUR_LAN_IP>:5173`.*

### Step 3: Flash ESP32 Firmware
1. Open `esp32/SecureBelong_ESP32/SecureBelong_ESP32.ino` in Arduino IDE.
2. In `config.h`, set your local Wi-Fi name, password, and your PC's IP address:
   ```cpp
   #define WIFI_SSID       "Your_WiFi"
   #define WIFI_PASSWORD   "Your_Password"
   #define MQTT_SERVER     "192.168.1.100" // Backend PC IP
   ```
3. Connect ESP32 via USB and click **Upload**.
4. Open Serial Monitor at **115200 baud**.

### Optional: Test without physical hardware using CLI Simulator
```bash
node esp32/simulator.js
```
*Press `m` for MPU movement, `p` for PIR intrusion, `a` to toggle ARM, `b` to toggle buzzer.*

---

## 6. Real Hardware Acceptance Checklist

- [x] **ESP32 Link**: Status shows `ONLINE ✓` when ESP32 powers on.
- [x] **Arm/Disarm**: Sends command to ESP32; triggers physical confirmation chirp.
- [x] **MPU6050 Motion**: Tilting/moving the belonging triggers immediate `🚨 Personal Belonging Moved` alert.
- [x] **PIR Intrusion**: Waving hand triggers `🚨 Area Intrusion Detected` alert and physical buzzer siren.
- [x] **Buzzer Control**: Tapping `STOP BUZZER` remotely silences the physical siren.
- [x] **Live GPS Map**: Displays device position on Leaflet OpenStreetMap.
- [x] **Disconnection Watchdog**: Marks device `OFFLINE ✕` within 15s if Wi-Fi or power drops.
- [x] **State Persistence**: Device configuration and audit event logs are saved in SQLite database across restarts.

---

## 7. Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| **ESP32 fails to connect to Wi-Fi** | Incorrect SSID/Password or 5GHz Wi-Fi | ESP32 only supports **2.4 GHz Wi-Fi** networks. Double check credentials in `config.h`. |
| **ESP32 connects to Wi-Fi but MQTT fails (rc = -2)** | Firewall or incorrect PC IP | Ensure backend is running. Whitelist port 1883 in Windows Firewall/macOS Firewall. Verify PC's LAN IP address. |
| **MPU6050 shows ERROR / 0.00g** | Loose I2C jumper wires | Check wiring: `SDA -> GPIO 21`, `SCL -> GPIO 22`, `VCC -> 3V3`. Ensure GY-521 LED is lit. |
| **GPS shows "SIGNAL NOT AVAILABLE"** | Indoor satellite blockage | Place the ceramic GPS patch antenna near an open window or outdoors for 1-2 minutes until its onboard PPS LED blinks. |
| **PIR sensor gives false triggers** | High sensitivity or warm airflow | Adjust left orange trimpot on HC-SR501 counter-clockwise to reduce sensitivity. |
