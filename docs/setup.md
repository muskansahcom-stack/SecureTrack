# SECUREBELONG: Setup & Installation Guide

## 1. Prerequisites

- **Hardware Components**:
  - 1x ESP32 DevKit V1 (30-pin or 38-pin ESP-WROOM-32)
  - 1x MPU6050 GY-521 6-DOF IMU
  - 1x HC-SR501 PIR Motion Sensor
  - 1x NEO-6M GPS Module with ceramic patch antenna
  - 1x 5V Active Buzzer (Continuous tone when energized)
  - Solderless Breadboard & Dupont jumper wires (Male-to-Male, Male-to-Female)
  - Micro-USB Data Cable
- **Software**:
  - Node.js v18+ (tested on Node v20/v22/v26) & npm
  - Arduino IDE 2.x OR PlatformIO (VS Code)

---

## 2. Backend & MQTT Gateway Setup

The backend comes with an **embedded Aedes MQTT broker on port 1883** and **Express REST + Socket.io on port 5001**. No separate Mosquitto installation is required!

### Step 1: Install Dependencies & Run Backend
```bash
cd backend
npm install
npm run dev
```

The terminal will confirm:
```
🛡️  SECUREBELONG IoT Server Running on http://localhost:5001
📡 Embedded MQTT Broker listening on port 1883
⚡ WebSocket Stream ready for mobile connections
```

### Step 2: Note your Machine's Local IP Address
Run in a separate terminal:
- **macOS / Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig`

Example: `192.168.1.100`. You will put this IP into the ESP32 `config.h`.

---

## 3. Mobile Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open your browser or mobile phone browser at:
`http://localhost:5173` or `http://<YOUR_LOCAL_IP>:5173`

---

## 4. ESP32 Firmware Flashing

### Step 1: Open Arduino IDE
1. Go to **Preferences** -> **Additional Board Manager URLs** and add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Open **Tools** -> **Board** -> **Boards Manager**, search for `esp32` and install the **esp32 by Espressif Systems** package.
3. Select **Tools** -> **Board** -> **ESP32 Arduino** -> **ESP32 Dev Module**.

### Step 2: Install Required Arduino Libraries
Open **Tools** -> **Manage Libraries...** and install:
1. **PubSubClient** by Nick O'Leary (v2.8+)
2. **ArduinoJson** by Benoît Blanchon (v6.21.x or v7.x)
3. **Adafruit MPU6050** by Adafruit (installs *Adafruit Unified Sensor* & *Adafruit BusIO*)
4. **TinyGPSPlus** by Mikal Hart

### Step 3: Configure `config.h`
Open `esp32/SecureBelong_ESP32/config.h` and update your Wi-Fi and server IP:
```cpp
#define WIFI_SSID       "MyHomeWiFi"
#define WIFI_PASSWORD   "MySecretPassword"
#define MQTT_SERVER     "192.168.1.100"  // <--- Your PC's Local IP
#define MQTT_PORT       1883
```

### Step 4: Upload Firmware
1. Connect ESP32 via USB.
2. Select the correct COM/Serial port under **Tools** -> **Port**.
3. Click **Upload** (Hold `BOOT` button on ESP32 if upload prompt appears).
4. Open **Serial Monitor** at **115200 baud**.
5. You will see:
   ```
   [WiFi] Connected successfully! IP: 192.168.1.155
   [Sensors] MPU6050 configured successfully.
   [GPS] Initializing NEO-6M GPS on UART2...
   [MQTT] Broker connected successfully!
   ```
6. Check your mobile web app — the status will immediately transition to:
   `ESP32 CONNECTED ✓`
