import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  BellRing,
  Volume2,
  VolumeX,
  Compass,
  Activity,
  AlertTriangle,
  Clock,
  Radio,
  Wifi,
  ChevronRight,
  EyeOff,
  Eye,
  Sliders,
  Sparkles,
  MapPin,
  CheckCircle,
  XCircle,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice } from '../context/DeviceContext.js';
import { AppTab } from '../types/index.js';

interface DashboardScreenProps {
  setCurrentTab: (tab: AppTab) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const {
    device,
    settings,
    telemetry,
    alerts,
    isAreaActive,
    isBelongingActive,
    isEsp32Connected,
    lastHeartbeatAgeSec,
    turnOnAreaSecurity,
    turnOffAreaSecurity,
    turnOnBelongingSecurity,
    turnOffBelongingSecurity,
    updateCustomNames,
    activateBuzzer,
    stopBuzzer,
    toggleSilentMode,
    isTestMode,
  } = useDevice();

  const [isTogglingArea, setIsTogglingArea] = useState(false);
  const [isTogglingBelonging, setIsTogglingBelonging] = useState(false);
  const [showEditNames, setShowEditNames] = useState(false);
  const [editAreaName, setEditAreaName] = useState(settings?.area_name || 'My Hostel Room');
  const [editBelongingName, setEditBelongingName] = useState(settings?.belonging_name || 'My Laptop Bag');

  const areaName = settings?.area_name || 'My Hostel Room';
  const belongingName = settings?.belonging_name || 'My Laptop Bag';
  const isSilent = settings?.silent_mode === 1;

  const isAlarmActive = telemetry?.buzzer_active || alerts.some(a => a.acknowledged === 0 && (a.alert_type === 'INTRUSION' || a.alert_type === 'MOTION'));
  const hasActiveAlert = alerts.some(a => a.acknowledged === 0 && (a.alert_type === 'INTRUSION' || a.alert_type === 'MOTION'));
  const pirMotion = telemetry?.pir?.motion;
  const mpuMotion = telemetry?.mpu?.motion_detected;
  const gpsValid = telemetry?.gps?.valid;

  // Overall status computation
  let overallStatus: 'PROTECTED' | 'ALERT' | 'OFFLINE' | 'DISARMED' = 'DISARMED';
  if (!isEsp32Connected && !isTestMode) {
    overallStatus = 'OFFLINE';
  } else if (hasActiveAlert || isAlarmActive) {
    overallStatus = 'ALERT';
  } else if (isAreaActive || isBelongingActive) {
    overallStatus = 'PROTECTED';
  } else {
    overallStatus = 'DISARMED';
  }

  const handleToggleArea = async () => {
    if (!isEsp32Connected && !isTestMode) return;
    setIsTogglingArea(true);
    try {
      if (isAreaActive) {
        await turnOffAreaSecurity();
      } else {
        await turnOnAreaSecurity();
      }
    } finally {
      setIsTogglingArea(false);
    }
  };

  const handleToggleBelonging = async () => {
    if (!isEsp32Connected && !isTestMode) return;
    setIsTogglingBelonging(true);
    try {
      if (isBelongingActive) {
        await turnOffBelongingSecurity();
      } else {
        await turnOnBelongingSecurity();
      }
    } finally {
      setIsTogglingBelonging(false);
    }
  };

  const handleSaveCustomNames = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCustomNames(editAreaName, editBelongingName);
    setShowEditNames(false);
  };

  const displayName = user?.name || 'Muskan';

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. Header: Personal Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Hello, {displayName}</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Your Security Overview</p>
        </div>
        <button
          onClick={() => {
            setEditAreaName(areaName);
            setEditBelongingName(belongingName);
            setShowEditNames(true);
          }}
          className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition flex items-center space-x-1 text-xs"
          title="Customize Names"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold hidden sm:inline">Customize</span>
        </button>
      </div>

      {/* 2. Overall Security Status Banner */}
      <div className={`rounded-3xl p-5 border-2 transition-all shadow-xl ${
        overallStatus === 'ALERT'
          ? 'bg-rose-950/80 border-rose-500 text-white shadow-rose-500/20 animate-pulse'
          : overallStatus === 'PROTECTED'
          ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 border-emerald-500/50 shadow-emerald-500/10'
          : overallStatus === 'OFFLINE'
          ? 'bg-gray-900 border-gray-800 text-gray-400'
          : 'bg-gray-900/90 border-gray-800 text-gray-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className={`w-3 h-3 rounded-full ${
              overallStatus === 'ALERT'
                ? 'bg-rose-400 animate-ping'
                : overallStatus === 'PROTECTED'
                ? 'bg-emerald-400 animate-pulse'
                : overallStatus === 'OFFLINE'
                ? 'bg-gray-600'
                : 'bg-blue-400'
            }`} />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Overall Security Status
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isEsp32Connected
                ? lastHeartbeatAgeSec === 0
                  ? 'Live'
                  : `${lastHeartbeatAgeSec}s ago`
                : 'Offline'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {overallStatus === 'ALERT' && '🚨 SECURITY ALERT'}
              {overallStatus === 'PROTECTED' && '🟢 YOU ARE PROTECTED'}
              {overallStatus === 'OFFLINE' && '⚫ SYSTEM OFFLINE'}
              {overallStatus === 'DISARMED' && '⚪ SYSTEM READY (STANDBY)'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {overallStatus === 'ALERT' && 'Active intrusion or belonging movement detected!'}
              {overallStatus === 'PROTECTED' && `${isAreaActive && isBelongingActive ? 'Both Area and Personal Belonging' : isAreaActive ? 'Area Protection (PIR)' : 'Belonging Protection (MPU6050)'} active.`}
              {overallStatus === 'OFFLINE' && 'ESP32 disconnected from network. Reconnecting...'}
              {overallStatus === 'DISARMED' && 'Both security modes are currently disarmed.'}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border ${
            overallStatus === 'ALERT'
              ? 'bg-rose-500/20 text-rose-400 border-rose-400/40'
              : overallStatus === 'PROTECTED'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
              : 'bg-gray-800 text-gray-500 border-gray-700'
          }`}>
            {overallStatus === 'ALERT' ? <ShieldAlert className="w-7 h-7" /> : overallStatus === 'PROTECTED' ? <ShieldCheck className="w-7 h-7" /> : <ShieldOff className="w-7 h-7" />}
          </div>
        </div>

        {/* ESP32 Device Connection Strip */}
        <div className="mt-4 pt-3.5 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-300">ESP32:</span>
            <span className={`inline-flex items-center space-x-1 font-bold ${isEsp32Connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              <span>●</span>
              <span>{isEsp32Connected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-400 font-mono text-[11px]">
            <Wifi className="w-3 h-3 text-blue-400" />
            <span>{isEsp32Connected ? `${telemetry?.wifi_rssi || -54} dBm` : 'No Signal'}</span>
          </div>
        </div>
      </div>

      {/* 3. Dedicated STOP ALARM Button when Alarm/Alert is Active */}
      {isAlarmActive && (
        <div className="bg-gradient-to-r from-rose-900 to-red-900 border-2 border-rose-500 rounded-3xl p-5 shadow-2xl shadow-rose-900/40 text-center animate-bounce-subtle">
          <div className="flex items-center justify-center space-x-2 text-white font-black text-sm uppercase tracking-wide mb-1">
            <BellRing className="w-5 h-5 animate-pulse text-amber-300" />
            <span>SIREN SOUNDING ON ESP32 HARDWARE</span>
          </div>
          <p className="text-xs text-rose-200 mb-4">Tap below to turn off the physical buzzer immediately.</p>
          <button
            onClick={() => stopBuzzer()}
            className="w-full py-4 rounded-2xl bg-white hover:bg-gray-100 active:scale-98 text-rose-900 font-black text-base tracking-wider shadow-2xl transition flex items-center justify-center space-x-2"
          >
            <VolumeX className="w-6 h-6 text-rose-600" />
            <span>STOP ALARM</span>
          </button>
        </div>
      )}

      {/* 4. TWO INDEPENDENT SECURITY CONTROLS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Independent Security Controls</h3>
          <span className="text-[10px] font-mono text-gray-500">Hardware Controlled</span>
        </div>

        {/* MODE 1: AREA SECURITY (HC-SR501 PIR) */}
        <div className={`rounded-3xl p-5 border-2 transition-all shadow-xl ${
          isAreaActive
            ? 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/90 border-blue-500/70 shadow-blue-500/10'
            : 'bg-gray-900/90 border-gray-800/90 shadow-black/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${
                isAreaActive ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">AREA SECURITY</span>
                <h4 className="text-base font-extrabold text-white">{areaName}</h4>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                isAreaActive
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-gray-800/80 text-gray-400 border-gray-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isAreaActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                <span>{isAreaActive ? 'ACTIVE' : 'OFF'}</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Monitors <strong className="text-gray-300">{areaName}</strong> using the <strong className="text-blue-300">HC-SR501 PIR</strong> motion tripwire sensor.
          </p>

          <button
            onClick={handleToggleArea}
            disabled={isTogglingArea || (!isEsp32Connected && !isTestMode)}
            className={`w-full mt-4 py-3.5 rounded-2xl font-black text-xs tracking-wider shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
              !isEsp32Connected && !isTestMode
                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                : isAreaActive
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            {!isEsp32Connected && !isTestMode ? (
              <span>DEVICE UNAVAILABLE (OFFLINE)</span>
            ) : isTogglingArea ? (
              <span>COMMUNICATING WITH ESP32...</span>
            ) : isAreaActive ? (
              <>
                <ShieldOff className="w-4 h-4" />
                <span>TURN OFF AREA SECURITY</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>TURN ON AREA SECURITY</span>
              </>
            )}
          </button>
        </div>

        {/* MODE 2: PERSONAL BELONGING SECURITY (MPU6050 IMU) */}
        <div className={`rounded-3xl p-5 border-2 transition-all shadow-xl ${
          isBelongingActive
            ? 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/90 border-indigo-500/70 shadow-indigo-500/10'
            : 'bg-gray-900/90 border-gray-800/90 shadow-black/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${
                isBelongingActive ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">PERSONAL BELONGING</span>
                <h4 className="text-base font-extrabold text-white">{belongingName}</h4>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                isBelongingActive
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-gray-800/80 text-gray-400 border-gray-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isBelongingActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                <span>{isBelongingActive ? 'ACTIVE' : 'OFF'}</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Protects <strong className="text-gray-300">{belongingName}</strong> against lift, vibration, or movement using the <strong className="text-indigo-300">MPU6050 6-DOF IMU</strong> sensor.
          </p>

          <button
            onClick={handleToggleBelonging}
            disabled={isTogglingBelonging || (!isEsp32Connected && !isTestMode)}
            className={`w-full mt-4 py-3.5 rounded-2xl font-black text-xs tracking-wider shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
              !isEsp32Connected && !isTestMode
                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                : isBelongingActive
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-600/20'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
            }`}
          >
            {!isEsp32Connected && !isTestMode ? (
              <span>DEVICE UNAVAILABLE (OFFLINE)</span>
            ) : isTogglingBelonging ? (
              <span>COMMUNICATING WITH ESP32...</span>
            ) : isBelongingActive ? (
              <>
                <ShieldOff className="w-4 h-4" />
                <span>TURN OFF BELONGING SECURITY</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>TURN ON BELONGING SECURITY</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Silent Covert Mode Switcher Strip */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${
            isSilent
              ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
              : 'bg-amber-600/20 text-amber-400 border-amber-500/30'
          }`}>
            {isSilent ? <EyeOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isSilent ? 'Covert Anti-Theft Mode' : 'Audible Siren Mode'}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {isSilent ? 'Hardware stays silent; phone alarms & streams live GPS' : 'Hardware buzzer screams when belonging moves'}
            </p>
          </div>
        </div>

        <button
          onClick={() => toggleSilentMode()}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
            isSilent
              ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/50 shadow-md shadow-purple-500/20'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
        >
          {isSilent ? 'Covert ON 🔕' : 'Mute Buzzer'}
        </button>
      </div>

      {/* 6. Four Quick Status Cards (Area, Belonging, GPS, Alarm) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Quick Status</h3>
          <span className="text-[11px] font-mono text-gray-500">Live Hardware Feed</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Area */}
          <div 
            onClick={() => setCurrentTab('sensors')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              pirMotion && isAreaActive
                ? 'bg-rose-950/80 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-gray-900/90 border-gray-800/80 hover:border-gray-700 text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Area</span>
              <div className={`p-1.5 rounded-lg ${pirMotion && isAreaActive ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-base font-extrabold mt-2.5 ${pirMotion && isAreaActive ? 'text-rose-400 animate-bounce' : isAreaActive ? 'text-emerald-400' : 'text-gray-400'}`}>
              {pirMotion && isAreaActive ? '🚨 Intrusion' : isAreaActive ? 'Safe ✓' : 'Disabled'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">PIR: {pirMotion ? 'Tripped' : 'Clear'}</p>
          </div>

          {/* Card 2: Belonging */}
          <div 
            onClick={() => setCurrentTab('sensors')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mpuMotion && isBelongingActive
                ? 'bg-amber-950/80 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-gray-900/90 border-gray-800/80 hover:border-gray-700 text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Belonging</span>
              <div className={`p-1.5 rounded-lg ${mpuMotion && isBelongingActive ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-base font-extrabold mt-2.5 ${mpuMotion && isBelongingActive ? 'text-amber-400 animate-pulse' : isBelongingActive ? 'text-emerald-400' : 'text-gray-400'}`}>
              {mpuMotion && isBelongingActive ? '⚠️ Moved' : isBelongingActive ? 'Safe ✓' : 'Disabled'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Mag: {telemetry?.mpu?.magnitude?.toFixed(2) || '0.00'}g</p>
          </div>

          {/* Card 3: GPS */}
          <div 
            onClick={() => setCurrentTab('location')}
            className="p-4 rounded-2xl border bg-gray-900/90 border-gray-800/80 hover:border-gray-700 text-gray-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">GPS</span>
              <div className={`p-1.5 rounded-lg ${gpsValid ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                <Compass className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-base font-extrabold mt-2.5 ${gpsValid ? 'text-blue-400' : 'text-gray-400'}`}>
              {gpsValid ? 'Available ✓' : 'Searching...'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {gpsValid ? `${telemetry?.gps?.satellites || 0} Sats Fixed` : 'NEO-6M Lock'}
            </p>
          </div>

          {/* Card 4: Alarm */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isAlarmActive
              ? 'bg-rose-950/80 border-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-gray-900/90 border-gray-800/80 text-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alarm</span>
              <div className={`p-1.5 rounded-lg ${isAlarmActive ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                <BellRing className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-base font-extrabold mt-2.5 ${isAlarmActive ? 'text-rose-400' : 'text-gray-400'}`}>
              {isAlarmActive ? '🚨 Active Siren' : 'Inactive'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Physical Buzzer</p>
          </div>
        </div>
      </div>

      {/* 7. Manual Siren Testing Controls */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Hardware Deterrent Test</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => activateBuzzer()}
            className="py-3 px-3 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 transition"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>SOUND BUZZER</span>
          </button>
          <button
            onClick={() => stopBuzzer()}
            className="py-3 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center space-x-2 transition"
          >
            <VolumeX className="w-4 h-4 text-gray-400" />
            <span>STOP SIREN</span>
          </button>
        </div>
      </div>

      {/* Custom Names Setup Modal */}
      {showEditNames && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Customize Protected Items</h3>
            <p className="text-xs text-gray-400 mb-4">Name your protected area and belonging for personal dashboard display.</p>

            <form onSubmit={handleSaveCustomNames} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Protected Area Name</label>
                <input
                  type="text"
                  required
                  value={editAreaName}
                  onChange={(e) => setEditAreaName(e.target.value)}
                  placeholder="e.g. My Hostel Room, Bedroom, Office"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Protected Belonging Name</label>
                <input
                  type="text"
                  required
                  value={editBelongingName}
                  onChange={(e) => setEditBelongingName(e.target.value)}
                  placeholder="e.g. My Laptop Bag, Backpack, Suitcase"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditNames(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
