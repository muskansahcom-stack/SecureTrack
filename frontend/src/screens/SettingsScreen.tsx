import React, { useState, useEffect } from 'react';
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
  Square,
  RotateCcw,
  EyeOff,
  Clock,
  Wifi,
  Server,
  Sparkles,
  Zap,
  Info,
  Siren
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice, alarmAudio, PoliceSirenMode } from '../context/DeviceContext.js';

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
    isEsp32Connected,
    lastHeartbeatAgeSec,
    setSensitivityPreset,
  } = useDevice();

  const [threshold, setThreshold] = useState<number>(settings?.movement_threshold ?? 0.30);
  const [sensitivityPreset, setSensitivityPresetState] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(settings?.sensitivity_preset ?? 'MEDIUM');
  const [pirEnabled, setPirEnabled] = useState<boolean>(settings?.pir_enabled !== 0);
  const [mpuEnabled, setMpuEnabled] = useState<boolean>(settings?.mpu_enabled !== 0);
  const [autoBuzzer, setAutoBuzzer] = useState<boolean>(settings?.auto_buzzer !== 0);
  const [silentMode, setSilentMode] = useState<boolean>(settings?.silent_mode === 1);
  const [alarmDuration, setAlarmDurationState] = useState<number>(settings?.alarm_duration_sec ?? 15);

  const [notifMotion, setNotifMotion] = useState<boolean>(settings?.notification_motion !== 0);
  const [notifIntrusion, setNotifIntrusion] = useState<boolean>(settings?.notification_intrusion !== 0);
  const [notifOffline, setNotifOffline] = useState<boolean>(settings?.notification_offline !== 0);
  const [notifGps, setNotifGps] = useState<boolean>(settings?.notification_gps !== 0);

  const [isSaved, setIsSaved] = useState(false);

  // Police Siren Audio Testing State
  const [sirenMode, setSirenMode] = useState<PoliceSirenMode>('CRUISER');
  const [isSirenActive, setIsSirenActive] = useState<boolean>(alarmAudio.isRunning());
  const [sirenVol, setSirenVol] = useState<number>(85);

  const toggleSirenTest = () => {
    if (isSirenActive) {
      alarmAudio.stopLoudSiren();
      setIsSirenActive(false);
    } else {
      alarmAudio.setVolume(sirenVol / 100);
      alarmAudio.startLoudSiren(sirenMode);
      setIsSirenActive(true);
    }
  };

  const handleModeChange = (mode: PoliceSirenMode) => {
    setSirenMode(mode);
    if (isSirenActive) {
      alarmAudio.startLoudSiren(mode);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setSirenVol(vol);
    alarmAudio.setVolume(vol / 100);
  };

  const handleSelectPreset = async (preset: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setSensitivityPresetState(preset);
    let th = 0.30;
    if (preset === 'LOW') th = 0.55;
    if (preset === 'MEDIUM') th = 0.30;
    if (preset === 'HIGH') th = 0.15;
    setThreshold(th);
    await setSensitivityPreset(preset);
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      movement_threshold: threshold,
      sensitivity_preset: sensitivityPreset,
      pir_enabled: pirEnabled ? 1 : 0,
      mpu_enabled: mpuEnabled ? 1 : 0,
      auto_buzzer: autoBuzzer ? 1 : 0,
      silent_mode: silentMode ? 1 : 0,
      alarm_duration_sec: alarmDuration,
      notification_motion: notifMotion ? 1 : 0,
      notification_intrusion: notifIntrusion ? 1 : 0,
      notification_offline: notifOffline ? 1 : 0,
      notification_gps: notifGps ? 1 : 0,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">System Settings & Calibration</h2>
          <p className="text-xs text-gray-400">Sensor sensitivities, false-alarm reduction & simulation</p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-lg transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSaved ? 'Saved! ✓' : 'Save Config'}</span>
        </button>
      </div>

      {/* 1. SECUREBELONG HARDWARE DEVICE PANEL */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">SecureBelong Hardware Unit</h3>
        <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Device ID:</span>
            <span className="font-mono font-bold text-white">{deviceId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">ESP32 Status:</span>
            <span className={`font-bold inline-flex items-center space-x-1 ${isEsp32Connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              <span>●</span>
              <span>{isEsp32Connected ? 'Connected' : 'Offline'}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Last Heartbeat:</span>
            <span className="font-mono text-gray-300">
              {isEsp32Connected ? (lastHeartbeatAgeSec === 0 ? 'Active' : `${lastHeartbeatAgeSec}s ago`) : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Sensor Array Health:</span>
            <span className="font-mono font-bold text-emerald-400">4 / 4 Operational</span>
          </div>
        </div>
      </div>

      {/* 2. SENSOR CALIBRATION & FALSE ALARM REDUCTION */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">MPU6050 Movement Sensitivity</h3>
              <p className="text-[10px] text-gray-400">False-alarm filtering & bump threshold</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-500/30">
            {threshold.toFixed(2)}g
          </span>
        </div>

        {/* Preset Selector */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Sensitivity Preset:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleSelectPreset(p)}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition ${
                  sensitivityPreset === p
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p === 'LOW' && 'LOW (0.55g)'}
                {p === 'MEDIUM' && 'MEDIUM (0.30g)'}
                {p === 'HIGH' && 'HIGH (0.15g)'}
              </button>
            ))}
          </div>
        </div>

        {/* Fine Tuning Slider */}
        <div className="pt-1">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Fine Adjustment Slider:</span>
            <span className="font-mono text-white font-bold">{threshold.toFixed(2)} g</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="1.20"
            step="0.05"
            value={threshold}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setThreshold(val);
              if (val > 0.45) setSensitivityPresetState('LOW');
              else if (val < 0.22) setSensitivityPresetState('HIGH');
              else setSensitivityPresetState('MEDIUM');
            }}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>0.10g (Ultra Sensitive)</span>
            <span>0.30g (Standard)</span>
            <span>1.20g (Heavy Bump)</span>
          </div>
        </div>

        {/* Buzzer Alarm Duration Setting */}
        <div className="pt-2 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Physical Buzzer Sounding Duration:</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {alarmDuration === 0 ? 'Continuous' : `${alarmDuration} seconds`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 10, 30, 0].map((sec) => (
              <button
                key={sec}
                onClick={() => setAlarmDurationState(sec)}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  alarmDuration === sec
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {sec === 0 ? 'Infinite' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. HARDWARE TOGGLES */}
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
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
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
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        {/* Auto Buzzer */}
        <div className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-xs font-bold text-white">Automatic Buzzer Deterrent</p>
              <p className="text-[10px] text-gray-400">Sound physical siren automatically on tripwire</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoBuzzer}
              onChange={(e) => setAutoBuzzer(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
          </label>
        </div>

        {/* Silent Covert Anti-Theft Mode */}
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <EyeOff className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs font-bold text-purple-200">Silent Anti-Theft Mode (Covert Tracking)</p>
              <p className="text-[10px] text-purple-300/80">Hardware stays silent; mobile app receives alerts & streams live GPS</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={silentMode}
              onChange={(e) => setSilentMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>
      </div>

      {/* 4. AUTHENTIC POLICE CRUISER SIREN & ACOUSTIC ENGINE */}
      <div className="bg-gradient-to-br from-rose-950/40 via-gray-900/90 to-blue-950/40 border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2.5 rounded-2xl border transition ${
              isSirenActive
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse'
                : 'bg-rose-600/20 text-rose-400 border-rose-500/30'
            }`}>
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center space-x-2">
                <span>Police Cruiser Siren Engine</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  100W PA Flare
                </span>
              </h3>
              <p className="text-[10px] text-gray-400">Authentic Federal Signal / Whelen multi-mode acoustic synthesis</p>
            </div>
          </div>
          <button
            onClick={toggleSirenTest}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-lg ${
              isSirenActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-400 animate-bounce'
                : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40'
            }`}
          >
            {isSirenActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP SIREN</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>TEST POLICE SIREN</span>
              </>
            )}
          </button>
        </div>

        {/* Siren Mode Selector */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Police Siren Acoustic Profile:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'CRUISER', name: 'Patrol Cruiser', desc: 'Dual Wail + Yelp Horn' },
              { id: 'WAIL', name: 'Police Wail', desc: 'Classic 0.25Hz sweep' },
              { id: 'YELP', name: 'Police Yelp', desc: 'Rapid 3.6Hz pursuit' },
              { id: 'PIERCER', name: 'Piercer / Phaser', desc: 'Ultra-fast 9.5Hz' },
              { id: 'HILO', name: 'Hi-Lo Two-Tone', desc: 'Tactical horn 1.6Hz' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id as PoliceSirenMode)}
                className={`p-2.5 rounded-xl text-left border transition ${
                  sirenMode === m.id
                    ? 'bg-gradient-to-r from-rose-600/30 to-blue-600/30 border-rose-400 text-white shadow-md'
                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <p className="text-xs font-bold text-white">{m.name}</p>
                <p className="text-[10px] text-gray-400">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Quick Sound FX Triggers */}
        <div className="pt-2 border-t border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Siren Speaker Output Volume:</span>
            </span>
            <span className="text-xs font-mono font-bold text-rose-400">{sirenVol}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={sirenVol}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />

          {/* Instant Emergency Sound Effects */}
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Instant Police Sound Effects (One-Shot):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => alarmAudio.playTone('HORN')}
                className="py-2 px-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-amber-300 font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <span>🎺 Air Horn Blast</span>
              </button>
              <button
                onClick={() => alarmAudio.playTone('POLICE_BURST')}
                className="py-2 px-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-rose-300 font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <span>🚨 Police Sweep</span>
              </button>
              <button
                onClick={() => alarmAudio.playTone('HIGH')}
                className="py-2 px-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-blue-300 font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <span>⚡ Yelp Chirp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. NOTIFICATIONS */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">In-App Notification Preferences</h3>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">Belonging Movement Alerts</span>
            <input
              type="checkbox"
              checked={notifMotion}
              onChange={(e) => setNotifMotion(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">Perimeter Intrusion Alerts</span>
            <input
              type="checkbox"
              checked={notifIntrusion}
              onChange={(e) => setNotifIntrusion(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer">
            <span className="font-semibold">ESP32 Offline Disconnection Alerts</span>
            <input
              type="checkbox"
              checked={notifOffline}
              onChange={(e) => setNotifOffline(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700"
            />
          </label>
        </div>
      </div>

      {/* 5. DEMO / SIMULATION MODE (FACULTY PRESENTATION) */}
      <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-amber-200">DEMO / SIMULATION MODE</h3>
              <p className="text-[10px] text-amber-300/80">College & Faculty Demonstration Sandbox</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {isTestMode ? (
          <div className="pt-2 border-t border-amber-500/30 space-y-2.5">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-[11px] font-mono text-amber-200">
              ⚠️ SIMULATION ACTIVE: Live synthesized telemetry is active. Clearly flagged as simulated test data.
            </div>
            <p className="text-xs text-amber-200 font-semibold">Simulated Alert Triggers:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => triggerTestAlert('MOTION')}
                className="py-2.5 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Simulate Bag Move</span>
              </button>
              <button
                onClick={() => triggerTestAlert('INTRUSION')}
                className="py-2.5 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Simulate Intrusion</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">
            When enabled, allows faculty presentation testing without requiring physical ESP32 hardware to be online.
          </p>
        )}
      </div>

      {/* 6. PROFILE & LOGOUT */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Account & Profile</h3>
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950 border border-gray-800 text-xs">
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
