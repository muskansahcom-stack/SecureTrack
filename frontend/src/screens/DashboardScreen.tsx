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
  Edit3,
  Home,
  Briefcase,
  Plane,
  AlertOctagon,
  ArrowUpRight,
  RefreshCw,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice } from '../context/DeviceContext.js';
import { AppTab, SecurityModeType } from '../types/index.js';

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
    events,
    currentSecurityMode,
    securityScore,
    isAreaActive,
    isBelongingActive,
    isEsp32Connected,
    isSocketConnected,
    lastHeartbeatAgeSec,
    latestCommandStatus,
    setSecurityMode,
    turnOnAreaSecurity,
    turnOffAreaSecurity,
    turnOnBelongingSecurity,
    turnOffBelongingSecurity,
    updateCustomNames,
    activateBuzzer,
    stopBuzzer,
    toggleSilentMode,
    isTestMode,
    refreshData,
  } = useDevice();

  const [isTogglingArea, setIsTogglingArea] = useState(false);
  const [isTogglingBelonging, setIsTogglingBelonging] = useState(false);
  const [isSettingMode, setIsSettingMode] = useState(false);
  const [showEditNames, setShowEditNames] = useState(false);
  const [editAreaName, setEditAreaName] = useState(settings?.area_name || 'My Hostel Room');
  const [editBelongingName, setEditBelongingName] = useState(settings?.belonging_name || 'My Laptop Bag');

  const areaName = settings?.area_name || 'My Hostel Room';
  const belongingName = settings?.belonging_name || 'My Laptop Bag';
  const isSilent = settings?.silent_mode === 1;

  const isBuzzerSounding = telemetry?.buzzer_active === true;
  const hasActiveAlert = alerts.some(a => a.acknowledged === 0 && (a.alert_type === 'INTRUSION' || a.alert_type === 'MOTION'));
  const pirMotion = telemetry?.pir?.motion === true;
  const mpuMotion = telemetry?.mpu?.motion_detected === true;
  const gpsValid = telemetry?.gps?.valid === true;

  // Overall Security Status computation matching requirements
  let overallStatus: 'SECURE' | 'WARNING' | 'ALERT' | 'OFFLINE' | 'STANDBY' = 'STANDBY';
  let statusMessage = 'System is ready in standby mode';

  if (!isEsp32Connected && !isTestMode) {
    overallStatus = 'OFFLINE';
    statusMessage = 'ESP32 prototype disconnected from Wi-Fi / MQTT';
  } else if (hasActiveAlert || isBuzzerSounding || (isAreaActive && pirMotion) || (isBelongingActive && mpuMotion)) {
    overallStatus = 'ALERT';
    statusMessage = isAreaActive && pirMotion
      ? `Intrusion detected in ${areaName}`
      : `Suspicious movement detected on ${belongingName}`;
  } else if (mpuMotion || pirMotion) {
    overallStatus = 'WARNING';
    statusMessage = 'Unconfirmed movement detected near sensors';
  } else if (isAreaActive || isBelongingActive) {
    overallStatus = 'SECURE';
    statusMessage = 'No suspicious activity detected. Perimeter active.';
  } else {
    overallStatus = 'STANDBY';
    statusMessage = 'All security layers are currently disarmed.';
  }

  const handleModeSelect = async (mode: SecurityModeType) => {
    if (!isEsp32Connected && !isTestMode) return;
    setIsSettingMode(true);
    try {
      await setSecurityMode(mode);
    } finally {
      setIsSettingMode(false);
    }
  };

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

  // Recent 4 activity events for quick timeline
  const recentEvents = events.slice(0, 4);

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. Header: Greeting & Profile Strip */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Hello, {displayName}</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Your Security Overview</p>
        </div>

        <button
          onClick={() => {
            setEditAreaName(areaName);
            setEditBelongingName(belongingName);
            setShowEditNames(true);
          }}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition flex items-center space-x-1.5 text-xs shadow-md"
          title="Customize Protected Items"
        >
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-bold hidden sm:inline">Customize Names</span>
        </button>
      </div>

      {/* 2. OVERALL SECURITY STATUS Banner */}
      <div className={`rounded-3xl p-5 border-2 transition-all shadow-2xl ${
        overallStatus === 'ALERT'
          ? 'bg-rose-950/80 border-rose-500 text-white shadow-rose-500/20 animate-pulse'
          : overallStatus === 'WARNING'
          ? 'bg-amber-950/80 border-amber-500 text-white shadow-amber-500/20'
          : overallStatus === 'SECURE'
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
                : overallStatus === 'WARNING'
                ? 'bg-amber-400 animate-pulse'
                : overallStatus === 'SECURE'
                ? 'bg-emerald-400 animate-pulse'
                : overallStatus === 'OFFLINE'
                ? 'bg-gray-600'
                : 'bg-blue-400'
            }`} />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
              OVERALL SECURITY STATUS
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isEsp32Connected
                ? lastHeartbeatAgeSec === 0
                  ? 'Live Sync'
                  : `${lastHeartbeatAgeSec}s ago`
                : 'Offline'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center space-x-2">
              {overallStatus === 'ALERT' && <span>🔴 SECURITY ALERT</span>}
              {overallStatus === 'WARNING' && <span>🟠 SECURITY WARNING</span>}
              {overallStatus === 'SECURE' && <span>🟢 SYSTEM SECURE</span>}
              {overallStatus === 'OFFLINE' && <span>⚫ DEVICE OFFLINE</span>}
              {overallStatus === 'STANDBY' && <span>⚪ STANDBY (DISARMED)</span>}
            </h2>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              {statusMessage}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border flex-shrink-0 ml-3 ${
            overallStatus === 'ALERT'
              ? 'bg-rose-500/20 text-rose-400 border-rose-400/40'
              : overallStatus === 'WARNING'
              ? 'bg-amber-500/20 text-amber-400 border-amber-400/40'
              : overallStatus === 'SECURE'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
              : 'bg-gray-800 text-gray-500 border-gray-700'
          }`}>
            {overallStatus === 'ALERT' ? (
              <ShieldAlert className="w-7 h-7" />
            ) : overallStatus === 'SECURE' ? (
              <ShieldCheck className="w-7 h-7" />
            ) : (
              <ShieldOff className="w-7 h-7" />
            )}
          </div>
        </div>

        {/* Real Hardware Diagnostics Strip */}
        <div className="mt-4 pt-3.5 border-t border-gray-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-gray-400">ESP32:</span>
            <span className={`font-bold inline-flex items-center space-x-1 ${isEsp32Connected ? 'text-emerald-400' : 'text-gray-500'}`}>
              <span>●</span>
              <span>{isEsp32Connected ? 'Connected' : 'Offline'}</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Wifi className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-gray-400">Wi-Fi:</span>
            <span className="font-mono text-gray-200">
              {isEsp32Connected ? `${telemetry?.wifi_rssi || -54} dBm` : 'No Signal'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-gray-400">MQTT:</span>
            <span className={`font-bold ${isSocketConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              ● {isSocketConnected ? 'Connected' : 'Lost'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-gray-400">GPS:</span>
            <span className={`font-bold ${gpsValid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {gpsValid ? `● Fixed (${telemetry?.gps?.satellites || 0})` : '● Searching'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOUR SECURITY MODES SELECTOR */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Security Mode Selection</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
            ACTIVE: {currentSecurityMode}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Mode 1: HOME */}
          <button
            onClick={() => handleModeSelect('HOME')}
            disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentSecurityMode === 'HOME'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <Home className={`w-4 h-4 ${currentSecurityMode === 'HOME' ? 'text-blue-400' : 'text-gray-500'}`} />
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${currentSecurityMode === 'HOME' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                HOME
              </span>
            </div>
            <h4 className="text-xs font-bold text-white mt-2">Home Mode</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Area: ON • Bag: OFF</p>
          </button>

          {/* Mode 2: AWAY */}
          <button
            onClick={() => handleModeSelect('AWAY')}
            disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentSecurityMode === 'AWAY'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <Briefcase className={`w-4 h-4 ${currentSecurityMode === 'AWAY' ? 'text-indigo-400' : 'text-gray-500'}`} />
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${currentSecurityMode === 'AWAY' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                AWAY
              </span>
            </div>
            <h4 className="text-xs font-bold text-white mt-2">Away Mode</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Area: ON • Bag: ON</p>
          </button>

          {/* Mode 3: TRAVEL */}
          <button
            onClick={() => handleModeSelect('TRAVEL')}
            disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentSecurityMode === 'TRAVEL'
                ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <Plane className={`w-4 h-4 ${currentSecurityMode === 'TRAVEL' ? 'text-cyan-400' : 'text-gray-500'}`} />
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${currentSecurityMode === 'TRAVEL' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                TRAVEL
              </span>
            </div>
            <h4 className="text-xs font-bold text-white mt-2">Travel Mode</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Bag: ON • GPS: ON</p>
          </button>

          {/* Mode 4: EMERGENCY */}
          <button
            onClick={() => handleModeSelect('EMERGENCY')}
            disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              currentSecurityMode === 'EMERGENCY'
                ? 'bg-rose-600/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <AlertOctagon className={`w-4 h-4 ${currentSecurityMode === 'EMERGENCY' ? 'text-rose-400' : 'text-gray-500'}`} />
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${currentSecurityMode === 'EMERGENCY' ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                EMERGENCY
              </span>
            </div>
            <h4 className="text-xs font-bold text-white mt-2">Emergency</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Max Siren & GPS</p>
          </button>
        </div>
      </div>

      {/* 4. PHYSICAL SIREN HARDWARE OVERRIDE (High Urgency) */}
      {(isBuzzerSounding || hasActiveAlert) && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-rose-500 rounded-3xl p-5 shadow-2xl shadow-rose-900/40 text-center animate-pulse">
          <div className="flex items-center justify-center space-x-2 text-white font-black text-sm uppercase tracking-wide mb-1">
            <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
            <span>SIREN SOUNDING ON ESP32 HARDWARE</span>
          </div>
          <p className="text-xs text-rose-200 mb-4">
            Physical 5V Buzzer is actively sounding on GPIO 23. Tap below to send disarm command.
          </p>
          <button
            onClick={() => stopBuzzer()}
            className="w-full py-4 rounded-2xl bg-white hover:bg-gray-100 active:scale-98 text-rose-900 font-black text-base tracking-wider shadow-2xl transition flex items-center justify-center space-x-2"
          >
            <VolumeX className="w-6 h-6 text-rose-600" />
            <span>TURN OFF PHYSICAL SIREN</span>
          </button>
        </div>
      )}

      {/* 5. TWO INDEPENDENT SECURITY HARDWARE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD A: PERSONAL BELONGING SECURITY (MPU6050) */}
        <div className={`rounded-3xl p-5 border-2 transition-all shadow-xl flex flex-col justify-between ${
          isBelongingActive
            ? mpuMotion
              ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-red-950 border-amber-500 shadow-amber-500/20 animate-pulse'
              : 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/90 border-indigo-500/70 shadow-indigo-500/10'
            : 'bg-gray-900/90 border-gray-800 shadow-black/40'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2.5 rounded-xl border ${
                  isBelongingActive ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    PERSONAL BELONGING
                  </span>
                  <h4 className="text-base font-black text-white">{belongingName}</h4>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                  isBelongingActive
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : 'bg-gray-800/80 text-gray-400 border-gray-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isBelongingActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isBelongingActive ? 'PROTECTED' : 'DISARMED'}</span>
                </span>
              </div>
            </div>

            {/* Belonging Telemetry Snapshot */}
            {isBelongingActive && mpuMotion ? (
              <div className="mt-4 p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-200 font-bold">
                  <span className="flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>🚨 BELONGING MOVEMENT DETECTED</span>
                  </span>
                  <span className="font-mono text-white text-[11px]">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-amber-500/30">
                  <div>
                    <span className="text-gray-400 block">Movement Intensity:</span>
                    <span className="font-bold text-amber-300">
                      {telemetry?.mpu?.intensity || 'HIGH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Acceleration Delta:</span>
                    <span className="font-mono font-bold text-white">
                      {telemetry?.mpu?.magnitude ? `${telemetry.mpu.magnitude.toFixed(2)} g` : '2.84 g'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Alarm State:</span>
                    <span className="font-bold text-rose-400">
                      {telemetry?.buzzer_active ? '🔴 ACTIVE' : 'STANDBY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">GPS Status:</span>
                    <span className="font-bold text-blue-400">
                      {gpsValid ? '● FIXED' : 'SEARCHING'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Sensor: <strong className="text-indigo-300">MPU6050 6-DOF IMU</strong>. {isBelongingActive ? 'Movement & tilt monitoring is active.' : 'Disarmed. Tap below to arm protection.'}
              </p>
            )}
          </div>

          <div className="mt-4 pt-2">
            <button
              onClick={handleToggleBelonging}
              disabled={isTogglingBelonging || (!isEsp32Connected && !isTestMode)}
              className={`w-full py-3.5 rounded-2xl font-black text-xs tracking-wider shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
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
                <span>SENDING COMMAND TO ESP32...</span>
              ) : isBelongingActive ? (
                <>
                  <ShieldOff className="w-4 h-4" />
                  <span>DISARM BELONGING</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>ARM PERSONAL BELONGING</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD B: AREA SECURITY (HC-SR501 PIR) */}
        <div className={`rounded-3xl p-5 border-2 transition-all shadow-xl flex flex-col justify-between ${
          isAreaActive
            ? pirMotion
              ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 border-rose-500 shadow-rose-500/20 animate-pulse'
              : 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/90 border-blue-500/70 shadow-blue-500/10'
            : 'bg-gray-900/90 border-gray-800 shadow-black/40'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2.5 rounded-xl border ${
                  isAreaActive ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                    AREA SECURITY
                  </span>
                  <h4 className="text-base font-black text-white">{areaName}</h4>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                  isAreaActive
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : 'bg-gray-800/80 text-gray-400 border-gray-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isAreaActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isAreaActive ? 'ARMED' : 'DISARMED'}</span>
                </span>
              </div>
            </div>

            {/* Area Telemetry Snapshot */}
            {isAreaActive && pirMotion ? (
              <div className="mt-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-2 text-xs">
                <div className="flex items-center justify-between text-rose-200 font-bold">
                  <span className="flex items-center space-x-1">
                    <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                    <span>🚨 INTRUSION DETECTED</span>
                  </span>
                  <span className="font-mono text-white text-[11px]">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-rose-500/30">
                  <div>
                    <span className="text-gray-400 block">Protected Area:</span>
                    <span className="font-bold text-white">{areaName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Sensor Output:</span>
                    <span className="font-mono font-bold text-rose-300">HIGH (Tripwire Breached)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Alarm State:</span>
                    <span className="font-bold text-rose-400">
                      {telemetry?.buzzer_active ? '🔴 ACTIVE' : 'STANDBY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Device Status:</span>
                    <span className="font-bold text-emerald-400">ONLINE</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Sensor: <strong className="text-blue-300">HC-SR501 PIR</strong> infrared perimeter tripwire. {isAreaActive ? 'Human motion monitoring is active.' : 'Disarmed. Tap below to arm perimeter.'}
              </p>
            )}
          </div>

          <div className="mt-4 pt-2">
            <button
              onClick={handleToggleArea}
              disabled={isTogglingArea || (!isEsp32Connected && !isTestMode)}
              className={`w-full py-3.5 rounded-2xl font-black text-xs tracking-wider shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
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
                <span>SENDING COMMAND TO ESP32...</span>
              ) : isAreaActive ? (
                <>
                  <ShieldOff className="w-4 h-4" />
                  <span>DISARM AREA SECURITY</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>ARM AREA SECURITY</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6. PHYSICAL BUZZER HARDWARE & DETERRENT CONTROL */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Physical Buzzer Output</h3>
              <p className="text-[10px] text-gray-400">ESP32 GPIO 23 Hardware Actuator</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
              isBuzzerSounding
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isBuzzerSounding ? '🔴 SOUNDING' : '🟢 STANDBY'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => activateBuzzer()}
            disabled={!isEsp32Connected && !isTestMode}
            className="py-3 px-3 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>SOUND BUZZER</span>
          </button>
          <button
            onClick={() => stopBuzzer()}
            disabled={!isEsp32Connected && !isTestMode}
            className="py-3 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-40"
          >
            <VolumeX className="w-4 h-4 text-gray-400" />
            <span>TURN OFF SIREN</span>
          </button>
        </div>

        {/* Command Status Feedback Strip */}
        {latestCommandStatus && (
          <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-400">
              Command: <strong className="text-white">{latestCommandStatus.command}</strong>
            </span>
            <span className={`font-bold ${
              latestCommandStatus.status === 'ACKNOWLEDGED'
                ? 'text-emerald-400'
                : latestCommandStatus.status === 'SENDING'
                ? 'text-amber-400 animate-pulse'
                : latestCommandStatus.status === 'FAILED'
                ? 'text-rose-400'
                : 'text-blue-400'
            }`}>
              {latestCommandStatus.status === 'SENDING' && 'Sending...'}
              {latestCommandStatus.status === 'SENT' && 'Sent to ESP32 ✓'}
              {latestCommandStatus.status === 'ACKNOWLEDGED' && 'Acknowledged ✓'}
              {latestCommandStatus.status === 'FAILED' && 'Failed ✕'}
            </span>
          </div>
        )}
      </div>

      {/* 7. Quick Metrics & Security Score Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Security Score */}
        <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Security Score</span>
          <div className="my-2">
            <span className="text-2xl font-black font-mono text-emerald-400">{securityScore}</span>
            <span className="text-xs text-gray-500 font-mono"> / 100</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${securityScore}%` }} />
          </div>
        </div>

        {/* Covert Mode */}
        <div 
          onClick={() => toggleSilentMode()}
          className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Covert Mode</span>
          <div className="my-2 flex items-center space-x-2">
            {isSilent ? <EyeOff className="w-5 h-5 text-purple-400" /> : <Eye className="w-5 h-5 text-blue-400" />}
            <span className="text-sm font-bold text-white">{isSilent ? 'Silent ON 🔕' : 'Audible 🔔'}</span>
          </div>
          <span className="text-[10px] text-gray-500">Tap to toggle</span>
        </div>

        {/* GPS Status */}
        <div 
          onClick={() => setCurrentTab('location')}
          className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bag GPS Lock</span>
          <div className="my-2 flex items-center space-x-1.5">
            <Compass className={`w-5 h-5 ${gpsValid ? 'text-blue-400' : 'text-amber-400'}`} />
            <span className={`text-sm font-bold ${gpsValid ? 'text-blue-400' : 'text-amber-400'}`}>
              {gpsValid ? `${telemetry?.gps?.satellites || 0} Sats Fixed` : 'Searching'}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 flex items-center space-x-1">
            <span>View map</span>
            <ArrowUpRight className="w-3 h-3 text-gray-400" />
          </span>
        </div>

        {/* Active Alerts Count */}
        <div 
          onClick={() => setCurrentTab('alerts')}
          className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recorded Alerts</span>
          <div className="my-2 flex items-center space-x-2">
            <BellRing className={`w-5 h-5 ${alerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span className="text-xl font-bold text-white">{alerts.length}</span>
          </div>
          <span className="text-[10px] text-gray-500 flex items-center space-x-1">
            <span>Audit trail</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </span>
        </div>
      </div>

      {/* 8. RECENT SECURITY ACTIVITY TIMELINE */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Security Activity</h3>
          <button
            onClick={() => setCurrentTab('alerts')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
          >
            <span>Full History</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentEvents.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No recent security events logged.</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-2 h-2 rounded-full ${
                    evt.severity === 'CRITICAL'
                      ? 'bg-rose-500 animate-ping'
                      : evt.severity === 'HIGH'
                      ? 'bg-amber-400'
                      : 'bg-blue-400'
                  }`} />
                  <div>
                    <p className="font-bold text-gray-200">{evt.event_type}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{evt.message}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap ml-2">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Customize Protected Names */}
      {showEditNames && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Customize Protected Items</h3>
            <p className="text-xs text-gray-400 mb-4">Name your protected area and personal belonging for customized display.</p>

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
