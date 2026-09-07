# SECUREBELONG: Complete Hardware Wiring & GPIO Guide

## 1. Hardware Pinout & Wiring Table

> [!CAUTION]
> **Voltage Safety Rules**:
> - ESP32 GPIOs operate at **3.3V logic level**. Applying 5V directly to ESP32 input GPIOs can damage the microcontroller.
> - The **MPU6050 GY-521** board features an on-board 3.3V LDO regulator. Connect VCC to the **3.3V (3V3)** pin of the ESP32.
> - The **HC-SR501 PIR sensor** requires **5V (VIN)** for its internal comparator, but its **OUT pin outputs 3.3V logic**, which is 100% safe for direct connection to ESP32 GPIOs.
> - The **NEO-6M GPS module** draws higher current when searching for satellite fixes; power its VCC from **5V (VIN)**. Its TX output is 3.3V logic compatible.

---

### Centralized Pin Connection Matrix

| Peripheral Component | Pin on Component | ESP32 Pin | Signal / Protocol | Voltage Level | Notes |
|---|---|---|---|---|---|
| **MPU6050 (GY-521)** | `VCC` | `3V3` | Power Rail | 3.3V DC | Connect to ESP32 3.3V output |
| | `GND` | `GND` | Common Ground | 0V | Breadboard Ground rail |
| | `SCL` | `GPIO 22` | I2C Clock (SCL) | 3.3V | Default Hardware I2C Clock |
| | `SDA` | `GPIO 21` | I2C Data (SDA) | 3.3V | Default Hardware I2C Data |
| | `AD0` | `GND` (or unconn.) | I2C Address Select | 0V | Pulling low sets I2C address to `0x68` |
| **HC-SR501 PIR** | `VCC` | `VIN (5V)` | Power Rail | 5V DC | Connect to ESP32 USB 5V rail |
| | `GND` | `GND` | Common Ground | 0V | Breadboard Ground rail |
| | `OUT` | `GPIO 13` | Digital Motion Input | 3.3V Logic | Active HIGH when human motion detected |
| **NEO-6M GPS** | `VCC` | `VIN (5V)` | Power Rail | 5V DC | Sufficient antenna LDO power |
| | `GND` | `GND` | Common Ground | 0V | Breadboard Ground rail |
| | `TX` | `GPIO 16 (RX2)` | HardwareSerial2 RX | 3.3V Logic | ESP32 receives NMEA sentences |
| | `RX` | `GPIO 17 (TX2)` | HardwareSerial2 TX | 3.3V Logic | Optional command config transmission |
| **5V Active Buzzer** | `Positive (+)` | `GPIO 23` | Digital Output | 3.3V / 5V | Driven directly or via NPN transistor |
| | `Negative (-)` | `GND` | Common Ground | 0V | Common Ground |

---

## 2. Safe GPIO Selection Rationale

The selected GPIO pins deliberately avoid ESP32 strapping pins and input-only pins:

- **GPIO 21 & GPIO 22**: Dedicated standard hardware I2C peripheral pins (`Wire`).
- **GPIO 16 & GPIO 17**: Dedicated UART2 hardware serial pins (`Serial2`), leaving `Serial0` (GPIO 1 / 3) completely free for USB flashing and serial monitor debugging.
- **GPIO 13**: Safe standard digital I/O pin with internal pull-down support for clean PIR detection.
- **GPIO 23**: Safe general-purpose output pin with up to 12mA drive capability for the active buzzer.
- **Boot Strapping Pins Avoided**: `GPIO 0`, `GPIO 2`, `GPIO 12`, `GPIO 15` are left unconnected or used only for non-conflicting status indicators to guarantee boot-loop-free startup.
- **Input-Only Pins Avoided for Outputs**: `GPIO 34`, `GPIO 35`, `GPIO 36`, `GPIO 39` (which lack internal pullups and output drivers) are never assigned to outputs like the buzzer.

---

## 3. HC-SR501 PIR Hardware Adjustment

The HC-SR501 module has two orange potentiometers and a jumper:

1. **Sensitivity (Left Trimpot)**: Turn clockwise to increase detection distance (up to 7 meters); counter-clockwise to reduce range (down to 3 meters). Recommended: ~50% (middle).
2. **Time Delay (Right Trimpot)**: Turn counter-clockwise to set minimum output pulse duration (~3 seconds).
3. **Trigger Jumper (Yellow Cap)**:
   - Set to **'H' (Repeatable Trigger)** mode so the pin remains HIGH as long as continuous motion is detected.
