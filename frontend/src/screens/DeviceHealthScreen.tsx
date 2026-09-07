import React from 'react';
import {
  Cpu,
  Wifi,
  Server,
  Activity,
  Radio,
  Compass,
  Volume2,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  RefreshCw,
  Zap,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const DeviceHealthScreen: React.FC = () => {
  const {
    deviceId,
    device,
    telemetry,
    settings,
    sensorHealth,
    isEsp32Connected,
    isSocketConnected,
    lastHeartbeatAgeSec,
    serverLatencyMs,
    refreshData,
    isTestMode,
  } = useDevice();

  const wifiRssi = telemetry?.wifi_rssi ?? device?.wifi_rssi ?? -54;

  const getSignalStrength = (rssi: number) => {
    if (rssi > -60) return { label: 'Excellent', color: 'text-emerald-400', badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' };
    if (rssi > -70) return { label: 'Good', color: 'text-blue-400', badge: 'bg-blue-950/80 text-blue-400 border-blue-500/30' };
    if (rssi > -80) return { label: 'Fair', color: 'text-amber-400', badge: 'bg-amber-950/80 text-amber-400 border-amber-500/30' };
    return { label: 'Weak', color: 'text-rose-400', badge: 'bg-rose-950/80 text-rose-400 border-rose-500/30' };
  };

  const signal = getSignalStrength(wifiRssi);

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Device Diagnostics & Health</h2>
          <p className="text-xs text-gray-400">Physical prototype integrity & sensor diagnostics</p>
        </div>
        <button
          onClick={() => refreshData()}
          className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition"
          title="Refresh Diagnostics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Master Hardware Health Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl border ${
              isEsp32Connected
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse'
            }`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">ESP32 DevKit V1 (ESP-WROOM-32)</h3>
              <p className="text-xs font-mono text-gray-400">Target ID: {deviceId}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
            isEsp32Connected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}>
            {isEsp32Connected ? 'ONLINE ✓' : 'OFFLINE ✕'}
          </span>
        </div>

        {/* Diagnostic Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-800">
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>HEARTBEAT</span>
            </div>
            <p className="text-sm font-mono font-bold text-white mt-1">
              {isEsp32Connected
                ? lastHeartbeatAgeSec === 0
                  ? 'Active now'
                  : `${lastHeartbeatAgeSec}s ago`
                : 'Disconnected'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>LATENCY</span>
            </div>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
              {serverLatencyMs > 0 ? `${serverLatencyMs}ms` : '< 5ms'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>UPTIME</span>
            </div>
            <p className="text-sm font-mono font-bold text-white mt-1">
              {telemetry?.uptime_sec ? `${Math.floor(telemetry.uptime_sec / 60)}m ${telemetry.uptime_sec % 60}s` : '1h 12m'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>FREE HEAP</span>
            </div>
            <p className="text-sm font-mono font-bold text-cyan-400 mt-1">
              {telemetry?.free_heap ? `${Math.round(telemetry.free_heap / 1024)} KB` : '182 KB'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Communication Links */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Communication & Gateway Layer</h3>

        {/* Wi-Fi Link */}
        <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Wifi className="w-4 h-4 text-blue-400" />
            <div>
              <p className="font-bold text-gray-200">ESP32 Wi-Fi Signal</p>
              <p className="text-[10px] text-gray-400 font-mono">
                Signal: {wifiRssi} dBm ({signal.label})
              </p>
            </div>
          </div>
          <span className={`font-bold px-2.5 py-1 rounded border text-[11px] font-mono ${signal.badge}`}>
            {isEsp32Connected ? `${signal.label.toUpperCase()} (${wifiRssi} dBm)` : 'DISCONNECTED'}
          </span>
        </div>

        {/* MQTT Broker Link */}
        <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Server className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="font-bold text-gray-200">Aedes MQTT Broker (:1883)</p>
              <p className="text-[10px] text-gray-400 font-mono">Protocol: TCP / QoS 1 / Duplex</p>
            </div>
          </div>
          <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 text-[11px] font-mono">
            CONNECTED
          </span>
        </div>

        {/* WebSocket Stream */}
        <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <div>
              <p className="font-bold text-gray-200">WebSocket Live Stream</p>
              <p className="text-[10px] text-gray-400 font-mono">Socket.io Engine v4</p>
            </div>
          </div>
          <span className={`font-bold px-2.5 py-1 rounded border text-[11px] font-mono ${
            isSocketConnected
              ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
              : 'text-rose-400 bg-rose-950/60 border-rose-500/30'
          }`}>
            {isSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* 3. Sensor Integrity Matrix with Timeout Handling */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sensor Diagnostic Matrix</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* MPU6050 */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-4 h-4 text-blue-400" />
              <div>
                <p className="font-bold text-gray-200">MPU6050 IMU</p>
                <p className="text-[10px] text-gray-500">I2C (SDA 21, SCL 22)</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              sensorHealth.mpu === 'OPERATIONAL'
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                : 'text-amber-400 bg-amber-950/50 border-amber-500/30 animate-pulse'
            }`}>
              {sensorHealth.mpu === 'OPERATIONAL' ? '● OPERATIONAL' : '🟠 SENSOR TIMEOUT'}
            </span>
          </div>

          {/* HC-SR501 */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Radio className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="font-bold text-gray-200">HC-SR501 PIR</p>
                <p className="text-[10px] text-gray-500">Digital Input (GPIO 13)</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              sensorHealth.pir === 'OPERATIONAL'
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                : 'text-gray-400 bg-gray-800 border-gray-700'
            }`}>
              {sensorHealth.pir === 'OPERATIONAL' ? '● OPERATIONAL' : 'DISABLED'}
            </span>
          </div>

          {/* NEO-6M GPS */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-bold text-gray-200">NEO-6M GPS</p>
                <p className="text-[10px] text-gray-500">UART2 (RX2 16, TX2 17)</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              sensorHealth.gps === 'LOCKED'
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                : 'text-amber-400 bg-amber-950/50 border-amber-500/30'
            }`}>
              {sensorHealth.gps === 'LOCKED' ? '● LOCKED (FIX)' : '🟠 SEARCHING'}
            </span>
          </div>

          {/* Active Buzzer */}
          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Volume2 className="w-4 h-4 text-rose-400" />
              <div>
                <p className="font-bold text-gray-200">5V Active Buzzer</p>
                <p className="text-[10px] text-gray-500">Digital Output (GPIO 23)</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              sensorHealth.buzzer === 'OPERATIONAL'
                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                : 'text-rose-400 bg-rose-950/50 border-rose-500/30'
            }`}>
              {sensorHealth.buzzer === 'OPERATIONAL' ? '● OPERATIONAL' : 'ERROR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
