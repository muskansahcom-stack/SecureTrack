import React from 'react';
import { Activity, Compass, Radio, Volume2, VolumeX, Shield, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const SensorsScreen: React.FC = () => {
  const { telemetry, settings, isEsp32Connected, isTestMode } = useDevice();

  const mpu = telemetry?.mpu;
  const pir = telemetry?.pir;
  const gps = telemetry?.gps;
  const buzzerActive = telemetry?.buzzer_active;
  const threshold = settings?.movement_threshold || 0.30;

  const currentMag = mpu?.magnitude || 0;
  const magPercentage = Math.min(100, Math.round((currentMag / (threshold * 2)) * 100));

  // Determine movement status and intensity
  const movementStatus = mpu?.movement_status || (currentMag > threshold * 1.5 ? 'HIGH MOVEMENT' : currentMag > threshold ? 'MOVEMENT' : 'NORMAL');
  const movementIntensity = mpu?.intensity || (currentMag > threshold * 1.5 ? 'HIGH' : currentMag > threshold ? 'MEDIUM' : 'LOW');

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Live Sensor Monitoring</h2>
          <p className="text-xs text-gray-400">Direct hardware telemetry stream from ESP32 prototype</p>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>Live Telemetry</span>
        </div>
      </div>

      {/* 1. MPU6050 GY-521 Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">MPU6050 6-DOF IMU</h3>
              <p className="text-[10px] text-gray-400">Personal Belonging Theft & Movement Tripwire</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
            mpu?.motion_detected || currentMag > threshold
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {movementStatus}
          </span>
        </div>

        {/* Movement Magnitude & Intensity Gauge */}
        <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Movement Delta Vector:</span>
            <span className="font-mono font-bold text-white">
              {currentMag.toFixed(3)}g / <span className="text-gray-500">{threshold.toFixed(2)}g Threshold</span>
            </span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ${
                currentMag > threshold ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(4, magPercentage)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 pt-1">
            <span>
              Intensity: <strong className={movementIntensity === 'HIGH' ? 'text-rose-400' : movementIntensity === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}>{movementIntensity}</strong>
            </span>
            <span>
              Status: <strong className={currentMag > threshold ? 'text-rose-400' : 'text-gray-300'}>{movementStatus}</strong>
            </span>
          </div>
        </div>

        {/* Accelerometer 3-Axis Grid */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            3-Axis Accelerometer (g)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-blue-400 block font-mono">ACCEL X</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.accel_x !== undefined ? `${mpu.accel_x.toFixed(3)}g` : '0.000g'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-indigo-400 block font-mono">ACCEL Y</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.accel_y !== undefined ? `${mpu.accel_y.toFixed(3)}g` : '0.000g'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-purple-400 block font-mono">ACCEL Z</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.accel_z !== undefined ? `${mpu.accel_z.toFixed(3)}g` : '1.000g'}
              </span>
            </div>
          </div>
        </div>

        {/* Gyroscope 3-Axis Grid */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            3-Axis Gyroscope (°/s)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-emerald-400 block font-mono">GYRO X</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.gyro_x !== undefined ? `${mpu.gyro_x.toFixed(1)}°/s` : '0.0°/s'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-teal-400 block font-mono">GYRO Y</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.gyro_y !== undefined ? `${mpu.gyro_y.toFixed(1)}°/s` : '0.0°/s'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] font-bold text-cyan-400 block font-mono">GYRO Z</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                {mpu?.gyro_z !== undefined ? `${mpu.gyro_z.toFixed(1)}°/s` : '0.0°/s'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HC-SR501 PIR Sensor Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">HC-SR501 PIR Motion Sensor</h3>
              <p className="text-[10px] text-gray-400">Area & Perimeter Infrared Detection</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
            pir?.motion
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-bounce'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {pir?.motion ? '🔴 MOTION DETECTED' : '● NO MOTION'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">GPIO 13 Signal</span>
            <span className="text-sm font-mono font-bold text-white mt-1 block">
              {pir?.motion ? 'HIGH (1)' : 'LOW (0)'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Current Status</span>
            <span className={`text-sm font-mono font-bold mt-1 block ${pir?.motion ? 'text-rose-400' : 'text-emerald-400'}`}>
              {pir?.motion ? 'Tripped' : 'Clear'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Total Detections</span>
            <span className="text-sm font-mono font-bold text-blue-400 mt-1 block">
              {pir?.detection_count || (pir?.motion ? 1 : 0)} Events
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Last Motion</span>
            <span className="text-xs font-mono font-bold text-gray-300 mt-1 block">
              {pir?.last_detected ? new Date(pir.last_detected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None recent'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. NEO-6M GPS Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">NEO-6M GPS Receiver</h3>
              <p className="text-[10px] text-gray-400">Satellite Geolocation Stream (GPIO 16/17 UART)</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
            gps?.valid
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {gps?.valid ? '● FIXED ✓' : '🟠 SEARCHING SATELLITES'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Latitude</span>
            <span className="text-xs font-mono font-bold text-white mt-0.5 block">
              {gps?.valid && gps?.latitude ? gps.latitude.toFixed(6) : 'Waiting...'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Longitude</span>
            <span className="text-xs font-mono font-bold text-white mt-0.5 block">
              {gps?.valid && gps?.longitude ? gps.longitude.toFixed(6) : 'Waiting...'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Locked Satellites</span>
            <span className="text-xs font-mono font-bold text-blue-400 mt-0.5 block">
              {gps?.satellites ?? 0} Satellites
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Velocity</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
              {gps?.speed ? `${gps.speed.toFixed(1)} km/h` : '0.0 km/h'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active 5V Buzzer Actuator Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">5V Active Buzzer Actuator</h3>
              <p className="text-[10px] text-gray-400">GPIO 23 Physical Siren Deterrent</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
            buzzerActive
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}>
            {buzzerActive ? '🔴 SOUNDING' : '🟢 STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
};
