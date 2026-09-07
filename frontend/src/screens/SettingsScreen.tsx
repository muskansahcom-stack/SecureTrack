import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  Activity,
  Radio,
  Volume2,
  VolumeX,
  Bell,
  Cpu,
  Save,
  AlertTriangle,
  Play,
  RotateCcw,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice, alarmAudio } from '../context/DeviceContext.js';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    deviceId,
    setDeviceId,
    deviceName,
    setDeviceName,
    settings,
    updateSettings,
    isTestMode,
    setTestMode,
    triggerTestAlert,
  } = useDevice();

  const [threshold, setThreshold] = useState<number>(settings?.movement_threshold ?? 0.30);
  const [pirEnabled, setPirEnabled] = useState<boolean>(settings?.pir_enabled !== 0);
  const [mpuEnabled, setMpuEnabled] = useState<boolean>(settings?.mpu_enabled !== 0);
  const [autoBuzzer, setAutoBuzzer] = useState<boolean>(settings?.auto_buzzer !== 0);
  const [silentMode, setSilentMode] = useState<boolean>(settings?.silent_mode === 1);
  const [alarmDuration, setAlarmDuration] = useState<number>(settings?.alarm_duration_sec ?? 15);
  
  const [notifMotion, setNotifMotion] = useState<boolean>(settings?.notification_motion !== 0);
  const [notifIntrusion, setNotifIntrusion] = useState<boolean>(settings?.notification_intrusion !== 0);
  const [notifOffline, setNotifOffline] = useState<boolean>(settings?.notification_offline !== 0);

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = async () => {
    await updateSettings({
      movement_threshold: threshold,
      pir_enabled: pirEnabled ? 1 : 0,
      mpu_enabled: mpuEnabled ? 1 : 0,
      auto_buzzer: autoBuzzer ? 1 : 0,
      silent_mode: silentMode ? 1 : 0,
      alarm_duration_sec: alarmDuration,
      notification_motion: notifMotion ? 1 : 0,
      notification_intrusion: notifIntrusion ? 1 : 0,
      notification_offline: notifOffline ? 1 : 0,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">System Settings</h2>
          <p className="text-xs text-gray-400">Sensor sensitivities & deterrence logic</p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-lg transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? 'Saved! ✓' : 'Save Config'}</span>
        </button>
      </div>

      {/* 1. MPU6050 Sensitivity Slider */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Belonging Movement Sensitivity</h3>
              <p className="text-[10px] text-gray-400">MPU6050 vector displacement tripwire</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-500/30">
            {threshold.toFixed(2)}g
          </span>
        </div>

        <div className="pt-2">
          <input
            type="range"
            min="0.10"
            max="1.50"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>0.10g (Ultra Sensitive)</span>
            <span>0.30g (Default)</span>
            <span>1.50g (Heavy Bump)</span>
          </div>
        </div>
      </div>

      {/* 2. Sensor Toggles */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sensor Enablement</h3>

        {/* HC-SR501 Toggle */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-white">HC-SR501 PIR Area Monitoring</p>
              <p className="text-[10px] text-gray-400">Arm perimeter human motion sensing</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pirEnabled}
              onChange={(e) => setPirEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* MPU6050 Toggle */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-xs font-bold text-white">MPU6050 Belonging Monitoring</p>
              <p className="text-[10px] text-gray-400">Arm acceleration & vibration trigger</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mpuEnabled}
              onChange={(e) => setMpuEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Auto Buzzer on Tripwire */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-xs font-bold text-white">Automatic Buzzer Deterrent</p>
              <p className="text-[10px] text-gray-400">Sound siren automatically on tripwire</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoBuzzer}
              onChange={(e) => setAutoBuzzer(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {/* Silent Covert Anti-Theft Mode */}
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <EyeOff className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs font-bold text-purple-200">Silent Anti-Theft Mode (Covert Tracking)</p>
              <p className="text-[10px] text-purple-300/80">Keep buzzer silent on bag movement so thief doesn't notice</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={silentMode}
              onChange={(e) => setSilentMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* 3. Notification Preferences */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">In-App Notification Alerts</h3>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">Motion Detected Alert Popups</span>
            <input
              type="checkbox"
              checked={notifMotion}
              onChange={(e) => setNotifMotion(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">Perimeter Intrusion Alert Popups</span>
            <input
              type="checkbox"
              checked={notifIntrusion}
              onChange={(e) => setNotifIntrusion(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">ESP32 Offline Disconnection Alerts</span>
            <input
              type="checkbox"
              checked={notifOffline}
              onChange={(e) => setNotifOffline(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700 focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* 4. Development / Simulation Mode */}
      <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-extrabold text-amber-200">Simulation / Test Mode</h3>
              <p className="text-[10px] text-amber-300/80">Use when physical ESP32 is powered off</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {isTestMode && (
          <div className="pt-2 border-t border-amber-500/30 space-y-2">
            <p className="text-[11px] text-amber-200">
              Test Alert Injection (Verify audible siren & popup response):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => triggerTestAlert('MOTION')}
                className="py-2 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 font-bold text-xs transition"
              >
                Trigger Motion Alert
              </button>
              <button
                onClick={() => triggerTestAlert('INTRUSION')}
                className="py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 font-bold text-xs transition"
              >
                Trigger Intrusion Alert
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Audio Output & Megaphone Siren Booster */}
      <div className="bg-rose-950/30 border border-rose-500/40 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Megaphone Siren Booster</h3>
              <p className="text-[10px] text-gray-400">Quad-Harmonic +14dB Psychoacoustic Resonance</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-950/80 px-2 py-1 rounded border border-rose-500/40">
            MAX BOOST
          </span>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          The siren engine is tuned for peak decibels on phone & laptop speakers to ensure emergency alerts are heard across rooms.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => alarmAudio.startLoudSiren()}
            className="py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-1.5 transition active:scale-98"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>TEST MAX SIREN</span>
          </button>
          <button
            onClick={() => alarmAudio.stopLoudSiren()}
            className="py-3 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-98"
          >
            <VolumeX className="w-4 h-4 text-gray-400" />
            <span>STOP SIREN</span>
          </button>
        </div>
      </div>

      {/* 5. User Profile & Account Logout */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Account & Profile</h3>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-950 border border-gray-800 text-xs">
          <div>
            <p className="font-bold text-white text-sm">{user?.name || 'Muskan'}</p>
            <p className="text-gray-400 text-xs">{user?.email || 'muskan@securebelong.com'}</p>
            {user?.phone && <p className="text-gray-500 text-[11px] mt-0.5">Phone: {user.phone}</p>}
          </div>
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            className="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
