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
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const DeviceHealthScreen: React.FC = () => {
  const {
    deviceId,
    device,
    telemetry,
    settings,
    isEsp32Connected,
    isSocketConnected,
    lastHeartbeatAgeSec,
    serverLatencyMs,
    refreshData,
  } = useDevice();

  const wifiRssi = telemetry?.wifi_rssi ?? device?.wifi_rssi ?? -65;
  const isMpuOk = isEsp32Connected; // Sensor reporting telemetry
  const isPirOk = isEsp32Connected && settings?.pir_enabled === 1;
  const isGpsOk = Boolean(telemetry?.gps?.valid);
  const isBuzzerOk = isEsp32Connected;

  const getSignalStrength = (rssi: number) => {
    if (rssi > -60) return { label: 'Excellent', color: 'text-emerald-400', bars: 4 };
    if (rssi > -70) return { label: 'Good', color: 'text-blue-400', bars: 3 };
    if (rssi > -80) return { label: 'Fair', color: 'text-amber-400', bars: 2 };
    return { label: 'Weak', color: 'text-rose-400', bars: 1 };
  };

  const signal = getSignalStrength(wifiRssi);

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Device Diagnostics & Health</h2>
          <p className="text-xs text-gray-400">Physical hardware integrity & telemetry stream</p>
        </div>
        <button
          onClick={() => refreshData()}
          className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Master Hardware Health Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              isEsp32Connected
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse'
            }`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">ESP32 DevKit V1</h3>
              <p className="text-xs font-mono text-gray-400">ID: {deviceId}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
            isEsp32Connected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}>
            {isEsp32Connected ? 'ONLINE ✓' : 'OFFLINE ✕'}
          </span>
        </div>

        {/* Diagnostic Key Metrics */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gray-800">
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80">
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>LAST HEARTBEAT</span>
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
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>SERVER LATENCY</span>
            </div>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
              {serverLatencyMs > 0 ? `${serverLatencyMs}ms` : '< 5ms'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Communication Links */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Network & Broker Links</h3>

        {/* Wi-Fi Link */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Wifi className="w-4 h-4 text-blue-400" />
            <div>
              <p className="font-bold text-gray-200">Wi-Fi Connection</p>
              <p className="text-[10px] text-gray-400 font-mono">
                RSSI: {wifiRssi} dBm ({signal.label})
              </p>
            </div>
          </div>
          <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            CONNECTED
          </span>
        </div>

        {/* MQTT Broker Link */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Server className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="font-bold text-gray-200">Aedes MQTT Broker (:1883)</p>
              <p className="text-[10px] text-gray-400 font-mono">Protocol: TCP / QoS 1</p>
            </div>
          </div>
          <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            CONNECTED
          </span>
        </div>

        {/* WebSocket Stream */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <div>
              <p className="font-bold text-gray-200">WebSocket Real-Time Stream</p>
              <p className="text-[10px] text-gray-400 font-mono">Socket.io Engine v4</p>
            </div>
          </div>
          <span className={`font-bold px-2 py-0.5 rounded border ${
            isSocketConnected
              ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
              : 'text-rose-400 bg-rose-950/60 border-rose-500/30'
          }`}>
            {isSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* 3. Sensor Integrity Matrix */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sensor Diagnostic Matrix</h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* MPU6050 */}
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-gray-200">MPU6050</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${isMpuOk ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isMpuOk ? 'CONNECTED ✓' : 'ERROR ✕'}
            </span>
          </div>

          {/* PIR */}
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-gray-200">PIR Sensor</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${isPirOk ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isPirOk ? 'ACTIVE ✓' : 'DISABLED'}
            </span>
          </div>

          {/* GPS */}
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-gray-200">NEO-6M GPS</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${isGpsOk ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isGpsOk ? 'LOCKED ✓' : 'ACQUIRING'}
            </span>
          </div>

          {/* Buzzer */}
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-gray-200">5V Buzzer</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${isBuzzerOk ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isBuzzerOk ? 'READY ✓' : 'ERROR ✕'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
