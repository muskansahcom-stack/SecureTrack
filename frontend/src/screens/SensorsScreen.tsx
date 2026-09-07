import React from 'react';
import { Activity, Compass, Radio, Volume2, VolumeX, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const SensorsScreen: React.FC = () => {
  const { telemetry, settings } = useDevice();

  const mpu = telemetry?.mpu;
  const pir = telemetry?.pir;
  const gps = telemetry?.gps;
  const buzzerActive = telemetry?.buzzer_active;
  const threshold = settings?.movement_threshold || 0.30;

  const currentMag = mpu?.magnitude || 0;
  const magPercentage = Math.min(100, Math.round((currentMag / (threshold * 2)) * 100));

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Live Sensor Monitoring</h2>
          <p className="text-xs text-gray-400">Direct hardware telemetry stream</p>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
          <span>1000ms Poll</span>
        </div>
      </div>

      {/* 1. MPU6050 GY-521 Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">MPU6050 6-DOF IMU</h3>
              <p className="text-[10px] text-gray-400">Personal Belonging Vibration & Tilt</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            mpu?.motion_detected
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            {mpu?.motion_detected ? '🚨 DETECTED' : 'NORMAL'}
          </span>
        </div>

        {/* Movement Magnitude Gauge */}
        <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-gray-400 font-medium">Movement Delta Vector:</span>
            <span className="font-mono font-bold text-white">
              {currentMag.toFixed(3)}g / <span className="text-gray-500">{threshold.toFixed(2)}g</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ${
                currentMag > threshold ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${magPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Accelerometer 3-Axis Grid */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Accelerometer (g)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-blue-400 block">X-AXIS</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.accel_x !== undefined ? `${mpu.accel_x.toFixed(3)}g` : '---'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-indigo-400 block">Y-AXIS</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.accel_y !== undefined ? `${mpu.accel_y.toFixed(3)}g` : '---'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-purple-400 block">Z-AXIS</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.accel_z !== undefined ? `${mpu.accel_z.toFixed(3)}g` : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Gyroscope 3-Axis Grid */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Gyroscope (°/s)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-emerald-400 block">GX</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.gyro_x !== undefined ? `${mpu.gyro_x.toFixed(1)}°/s` : '---'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-teal-400 block">GY</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.gyro_y !== undefined ? `${mpu.gyro_y.toFixed(1)}°/s` : '---'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-cyan-400 block">GZ</span>
              <span className="text-sm font-mono font-bold text-white">
                {mpu?.gyro_z !== undefined ? `${mpu.gyro_z.toFixed(1)}°/s` : '---'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HC-SR501 PIR Sensor Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">HC-SR501 PIR Sensor</h3>
              <p className="text-[10px] text-gray-400">Perimeter Infrared Intrusion</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
            pir?.motion
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-bounce'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            {pir?.motion ? '🚨 MOTION DETECTED' : 'NO MOTION'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Digital Pin 13 Signal</span>
            <span className="text-base font-mono font-bold text-white mt-1 block">
              {pir?.motion ? 'HIGH (1)' : 'LOW (0)'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Perimeter Security State</span>
            <span className={`text-base font-mono font-bold mt-1 block ${pir?.motion ? 'text-rose-400' : 'text-emerald-400'}`}>
              {pir?.motion ? 'Breached' : 'Secure'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. NEO-6M GPS Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">NEO-6M GPS Receiver</h3>
              <p className="text-[10px] text-gray-400">Satellite Geolocation</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            gps?.valid
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {gps?.valid ? 'FIX: YES ✓' : 'FIX: NO ✕'}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Latitude</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                {gps?.valid && gps?.latitude ? gps.latitude.toFixed(6) : '---.------'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Longitude</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                {gps?.valid && gps?.longitude ? gps.longitude.toFixed(6) : '---.------'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Locked Satellites</span>
              <span className="text-xs font-mono font-bold text-blue-400 mt-0.5 block">
                {gps?.satellites ?? 0} Sats
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Altitude</span>
              <span className="text-xs font-mono font-bold text-indigo-400 mt-0.5 block">
                {gps?.altitude ? `${gps.altitude.toFixed(1)}m` : '---'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Buzzer Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">5V Physical Buzzer</h3>
              <p className="text-[10px] text-gray-400">GPIO 23 Active Output</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
            buzzerActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {buzzerActive ? '🚨 ON (SIREN ACTIVE)' : 'OFF (STANDBY)'}
          </span>
        </div>
      </div>
    </div>
  );
};
