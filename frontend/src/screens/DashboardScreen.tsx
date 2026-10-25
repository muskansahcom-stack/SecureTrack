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
  WifiOff,
  ChevronRight,
  EyeOff,
  Eye,
  Sliders,
  Sparkles,
  MapPin,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Home,
  Briefcase,
  Plane,
  AlertOctagon,
  ArrowUpRight,
  RefreshCw,
  Server,
  Cpu,
  Navigation,
  Layers,
  Lock,
  Unlock,
  Settings,
  Link2,
  Zap,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice } from '../context/DeviceContext.js';
import { AppTab, SecurityModeType } from '../types/index.js';

interface DashboardScreenProps {
  setCurrentTab: (tab: AppTab) => void;
}

export type DashboardSection = 'belonging' | 'area' | 'hardware' | 'overview';

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const {
    deviceId,
    device,
    assets,
    activeAsset,
    settings,
    telemetry,
    alerts,
    events,
    currentSecurityMode,
    securityScore,
    sensorHealth,
    isAreaActive,
    isBelongingActive,
    isEsp32Connected,
    isSocketConnected,
    lastHeartbeatAgeSec,
    serverLatencyMs,
    latestCommandStatus,
    setSecurityMode,
    turnOnAreaSecurity,
    turnOffAreaSecurity,
    turnOnBelongingSecurity,
    turnOffBelongingSecurity,
    armProtection,
    disarmProtection,
    stopSiren,
    updateCustomNames,
    activateBuzzer,
    stopBuzzer,
    toggleSilentMode,
    setSensitivityPreset,
    setMovementThreshold,
    pairDeviceAsset,
    isTestMode,
    refreshData,
  } = useDevice();

  // Active modular section within the dashboard
  const [activeSection, setActiveSection] = useState<DashboardSection>('belonging');

  const [isTogglingArea, setIsTogglingArea] = useState(false);
  const [isTogglingBelonging, setIsTogglingBelonging] = useState(false);
  const [isSettingMode, setIsSettingMode] = useState(false);
  const [showEditNames, setShowEditNames] = useState(false);
  const [editAreaName, setEditAreaName] = useState(settings?.area_name || 'My Hostel Room');
  const [editBelongingName, setEditBelongingName] = useState(settings?.belonging_name || 'My Laptop');

  // Hardware pairing state
  const [pairDevId, setPairDevId] = useState(deviceId || 'ESP32-SECURITY-001');
  const [pairAssetName, setPairAssetName] = useState('My Laptop');
  const [pairAssetType, setPairAssetType] = useState('LAPTOP');
  const [isPairing, setIsPairing] = useState(false);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);

  const areaName = settings?.area_name || 'My Hostel Room';
  const belongingName = activeAsset?.asset_name || settings?.belonging_name || 'My Laptop';
  const isSilent = settings?.silent_mode === 1;

  const isBuzzerSounding = telemetry?.buzzer_active === true;
  const hasActiveAlert = alerts.some(a => a.acknowledged === 0 && (a.alert_type === 'INTRUSION' || a.alert_type === 'MOTION'));
  const pirMotion = telemetry?.pir?.motion === true;
  const mpuMotion = telemetry?.mpu?.motion_detected === true;
  const gpsValid = telemetry?.gps?.valid === true;

  // Telemetry values
  const currentMag = telemetry?.mpu?.magnitude || 0;
  const movementThreshold = settings?.movement_threshold || 0.30;
  const magPercentage = Math.min(100, Math.round((currentMag / (movementThreshold * 2)) * 100));
  const movementStatus = mpuMotion || currentMag > movementThreshold ? 'ABNORMAL MOVEMENT' : 'STATIONARY';
  const movementIntensity = telemetry?.mpu?.intensity || (currentMag > movementThreshold * 1.5 ? 'HIGH' : currentMag > movementThreshold ? 'MEDIUM' : 'LOW');

  // Overall Security Status computation
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
    statusMessage = 'Perimeter active. All assets monitored.';
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

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPairing(true);
    setPairSuccess(null);
    try {
      await pairDeviceAsset(pairDevId, pairAssetName, pairAssetType, 'PERSONAL_BELONGING');
      setPairSuccess(`Associated ${pairDevId} with "${pairAssetName}" successfully!`);
      setTimeout(() => setPairSuccess(null), 4000);
    } finally {
      setIsPairing(false);
    }
  };

  const displayName = user?.name || 'Muskan';

  // Filter recent events for belonging vs area
  const belongingEvents = events.filter(e => e.sensor === 'MPU6050' || e.event_type.includes('MOTION') || e.event_type.includes('BELONGING')).slice(0, 5);
  const areaEvents = events.filter(e => e.sensor === 'PIR' || e.event_type.includes('PIR') || e.event_type.includes('INTRUSION')).slice(0, 5);
  const recentEvents = events.slice(0, 5);

  return (
    <div className="space-y-6 pb-24 select-none">
      {/* 1. Header: Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Hello, {displayName}</span>
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">
            IoT Personal Belonging & Area Security Hub
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Hardware Connection Indicator */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-2 ${
            isEsp32Connected
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isEsp32Connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isEsp32Connected ? 'ESP32 ONLINE' : 'REAL HARDWARE OFFLINE'}</span>
          </div>

          <button
            onClick={() => {
              setEditAreaName(areaName);
              setEditBelongingName(belongingName);
              setShowEditNames(true);
            }}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition flex items-center space-x-1.5 text-xs shadow-md"
            title="Customize Protected Items"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold hidden sm:inline">Customize Names</span>
          </button>
        </div>
      </div>

      {/* 2. PHYSICAL SIREN HARDWARE OVERRIDE (High Urgency) */}
      {(isBuzzerSounding || hasActiveAlert) && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-rose-500 rounded-3xl p-5 shadow-2xl shadow-rose-900/40 text-center animate-pulse">
          <div className="flex items-center justify-center space-x-2 text-white font-black text-sm sm:text-base uppercase tracking-wide mb-1">
            <BellRing className="w-6 h-6 text-amber-300 animate-bounce" />
            <span>PHYSICAL SIREN SOUNDING ON ESP32 HARDWARE (GPIO 23)</span>
          </div>
          <p className="text-xs text-rose-200 mb-4 max-w-xl mx-auto">
            Abnormal event detected. The local 5V buzzer on your hardware prototype is sounding.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => stopBuzzer()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:scale-98 text-rose-900 font-black text-sm tracking-wider shadow-2xl transition flex items-center justify-center space-x-2"
            >
              <VolumeX className="w-5 h-5 text-rose-600" />
              <span>TURN OFF PHYSICAL SIREN</span>
            </button>
            <button
              onClick={() => setCurrentTab('location')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-rose-800 hover:bg-rose-700 text-white font-bold text-sm shadow-lg transition flex items-center justify-center space-x-2"
            >
              <MapPin className="w-4 h-4 text-amber-300" />
              <span>VIEW LIVE GPS LOCATION</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MODULAR SECTION NAVIGATION TABS */}
      <div className="bg-gray-900/90 p-1.5 rounded-3xl border border-gray-800 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {/* Tab 1: Personal Belonging Security */}
          <button
            onClick={() => setActiveSection('belonging')}
            className={`p-3 sm:p-4 rounded-2xl transition-all flex flex-col items-start justify-between text-left ${
              activeSection === 'belonging'
                ? 'bg-gradient-to-br from-indigo-900/90 via-indigo-950 to-slate-900 border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white'
                : 'bg-gray-950/80 hover:bg-gray-800/80 border border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-2 rounded-xl border ${
                activeSection === 'belonging' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}>
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                isBelongingActive
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {isBelongingActive ? 'ARMED ●' : 'DISARMED'}
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                Personal Belongings
              </h3>
              <p className="text-[10px] sm:text-[11px] text-indigo-300/80 font-mono mt-0.5 truncate">
                {belongingName} • MPU6050
              </p>
            </div>
          </button>

          {/* Tab 2: Area Security */}
          <button
            onClick={() => setActiveSection('area')}
            className={`p-3 sm:p-4 rounded-2xl transition-all flex flex-col items-start justify-between text-left ${
              activeSection === 'area'
                ? 'bg-gradient-to-br from-blue-900/90 via-blue-950 to-slate-900 border-2 border-blue-500 shadow-lg shadow-blue-500/20 text-white'
                : 'bg-gray-950/80 hover:bg-gray-800/80 border border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-2 rounded-xl border ${
                activeSection === 'area' ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}>
                <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                isAreaActive
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {isAreaActive ? 'ARMED ●' : 'DISARMED'}
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                Area Security
              </h3>
              <p className="text-[10px] sm:text-[11px] text-blue-300/80 font-mono mt-0.5 truncate">
                {areaName} • HC-SR501
              </p>
            </div>
          </button>

          {/* Tab 3: Connect Hardware */}
          <button
            onClick={() => setActiveSection('hardware')}
            className={`p-3 sm:p-4 rounded-2xl transition-all flex flex-col items-start justify-between text-left ${
              activeSection === 'hardware'
                ? 'bg-gradient-to-br from-cyan-900/90 via-cyan-950 to-slate-900 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20 text-white'
                : 'bg-gray-950/80 hover:bg-gray-800/80 border border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-2 rounded-xl border ${
                activeSection === 'hardware' ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}>
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                isEsp32Connected
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-950 text-rose-400 border-rose-500/40'
              }`}>
                {isEsp32Connected ? 'ONLINE ●' : 'OFFLINE'}
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                Connect Hardware
              </h3>
              <p className="text-[10px] sm:text-[11px] text-cyan-300/80 font-mono mt-0.5 truncate">
                {deviceId} • DevKit V1
              </p>
            </div>
          </button>

          {/* Tab 4: Security Overview */}
          <button
            onClick={() => setActiveSection('overview')}
            className={`p-3 sm:p-4 rounded-2xl transition-all flex flex-col items-start justify-between text-left ${
              activeSection === 'overview'
                ? 'bg-gradient-to-br from-purple-900/90 via-purple-950 to-slate-900 border-2 border-purple-500 shadow-lg shadow-purple-500/20 text-white'
                : 'bg-gray-950/80 hover:bg-gray-800/80 border border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-2 rounded-xl border ${
                activeSection === 'overview' ? 'bg-purple-600 text-white border-purple-400' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}>
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase bg-gray-800 text-gray-300 border-gray-700">
                {overallStatus}
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                Security Overview
              </h3>
              <p className="text-[10px] sm:text-[11px] text-purple-300/80 font-mono mt-0.5 truncate">
                Modes & Master Audit
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. ACTIVE SECTION WORKSPACE                                           */}
      {/* ===================================================================== */}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW A: PERSONAL BELONGING SECURITY WORKSPACE                         */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'belonging' && (
        <div className="space-y-6">
          {/* Main Belonging Hero Card */}
          <div className={`rounded-3xl p-6 sm:p-7 border-2 transition-all shadow-2xl ${
            isBelongingActive
              ? mpuMotion
                ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-red-950 border-amber-500 shadow-amber-500/20 animate-pulse'
                : 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/90 border-indigo-500/70 shadow-indigo-500/10'
              : 'bg-gray-900/90 border-gray-800 shadow-black/40'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  isBelongingActive ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <Briefcase className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      PERSONAL BELONGING PROTECTION
                    </span>
                    <span className="text-[10px] font-mono text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                      {deviceId}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {belongingName}
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-xl">
                    Monitored by onboard <strong>MPU6050 6-DOF IMU</strong> sensor. When physically lifted or disturbed, ESP32 triggers on-chip siren instantly.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border ${
                  isBelongingActive
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${isBelongingActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isBelongingActive ? 'ARMED & PROTECTED' : 'DISARMED (STANDBY)'}</span>
                </span>

                <span className={`inline-flex items-center space-x-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${
                  isEsp32Connected
                    ? 'bg-blue-950 text-blue-400 border-blue-500/40'
                    : 'bg-rose-950 text-rose-400 border-rose-500/40'
                }`}>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{isEsp32Connected ? `${telemetry?.wifi_rssi || -54} dBm` : 'OFFLINE'}</span>
                </span>
              </div>
            </div>

            {/* Edge Autonomy Callout */}
            <div className="mt-5 p-3 rounded-2xl bg-black/40 border border-indigo-500/30 flex items-center space-x-2 text-xs text-indigo-200">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Edge Alarm Guarantee:</strong> MPU6050 theft detection runs locally on the ESP32 chip. If movement is confirmed, the 5V active buzzer activates immediately on GPIO 23 even if Wi-Fi or Internet disconnects.
              </span>
            </div>

            {/* Belonging Actions Strip */}
            <div className="mt-5 pt-4 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleToggleBelonging}
                disabled={isTogglingBelonging || (!isEsp32Connected && !isTestMode)}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider shadow-xl flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
                  !isEsp32Connected && !isTestMode
                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                    : isBelongingActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-600/30'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/40'
                }`}
              >
                {!isEsp32Connected && !isTestMode ? (
                  <span>REAL HARDWARE NOT CONNECTED</span>
                ) : isTogglingBelonging ? (
                  <span>DISPATCHING COMMAND TO ESP32...</span>
                ) : isBelongingActive ? (
                  <>
                    <ShieldOff className="w-5 h-5" />
                    <span>DISARM PROTECTION</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>ARM PROTECTION NOW</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  stopSiren();
                  stopBuzzer();
                }}
                className={`py-4 px-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition border ${
                  isBuzzerSounding
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-600/40'
                    : 'bg-gray-950 hover:bg-gray-800 border-gray-800 text-gray-300 hover:text-white'
                }`}
              >
                <VolumeX className="w-5 h-5 text-rose-400" />
                <span>{isBuzzerSounding ? 'STOP ACTIVE SIREN' : 'STOP SIREN'}</span>
              </button>

              <button
                onClick={() => setCurrentTab('location')}
                className="py-4 px-4 rounded-2xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-bold text-sm flex items-center justify-center space-x-2 transition"
              >
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>VIEW LIVE LOCATION</span>
              </button>
            </div>
          </div>

          {/* MPU6050 Complete Hardware Telemetry Stream */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">MPU6050 Motion & Tilt Telemetry</h3>
                  <p className="text-xs text-gray-400">Live 6-DOF IMU data from I2C bus (SDA 21, SCL 22)</p>
                </div>
              </div>
              <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                mpuMotion || currentMag > movementThreshold
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {movementStatus}
              </span>
            </div>

            {/* Real-time Movement Magnitude vs Threshold Gauge */}
            <div className="p-5 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs sm:text-sm">
                <span className="text-gray-300 font-semibold flex items-center space-x-2">
                  <span>Current Acceleration Delta:</span>
                  <span className="font-mono font-bold text-white text-base">
                    {currentMag.toFixed(3)} g
                  </span>
                </span>
                <span className="text-gray-400 font-mono text-xs">
                  Alarm Threshold: <strong className="text-amber-400">{movementThreshold.toFixed(2)} g</strong> (Confirm: 3 samples / 150ms)
                </span>
              </div>

              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden relative p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    currentMag > movementThreshold
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 animate-pulse'
                      : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400'
                  }`}
                  style={{ width: `${Math.max(3, magPercentage)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-gray-400 pt-1">
                <span>
                  Movement Intensity: <strong className={movementIntensity === 'HIGH' ? 'text-rose-400' : movementIntensity === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}>{movementIntensity}</strong>
                </span>
                <span>
                  Alarm Decision: <strong className={currentMag > movementThreshold ? 'text-rose-400' : 'text-emerald-400'}>{currentMag > movementThreshold ? 'TRIGGERED ⚠️' : 'CLEAR ✓'}</strong>
                </span>
              </div>
            </div>

            {/* 3-Axis Accelerometer & 3-Axis Gyroscope side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 3-Axis Accelerometer */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-2.5">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  3-Axis Accelerometer (g)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-indigo-400 block font-mono">ACCEL X</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.accel_x !== undefined ? `${telemetry.mpu.accel_x.toFixed(3)}g` : '0.000g'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-blue-400 block font-mono">ACCEL Y</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.accel_y !== undefined ? `${telemetry.mpu.accel_y.toFixed(3)}g` : '0.000g'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-cyan-400 block font-mono">ACCEL Z</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.accel_z !== undefined ? `${telemetry.mpu.accel_z.toFixed(3)}g` : '1.000g'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Axis Gyroscope */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-2.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                  3-Axis Gyroscope (°/s - Rotation Rate)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-purple-400 block font-mono">GYRO X</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.gyro_x !== undefined ? `${telemetry.mpu.gyro_x.toFixed(2)}°/s` : '0.00°/s'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-fuchsia-400 block font-mono">GYRO Y</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.gyro_y !== undefined ? `${telemetry.mpu.gyro_y.toFixed(2)}°/s` : '0.00°/s'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center">
                    <span className="text-[10px] font-bold text-pink-400 block font-mono">GYRO Z</span>
                    <span className="text-base font-mono font-bold text-white mt-1 block">
                      {telemetry?.mpu?.gyro_z !== undefined ? `${telemetry.mpu.gyro_z.toFixed(2)}°/s` : '0.00°/s'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensitivity Presets & Calibration Slider */}
            <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Theft Sensitivity Calibration</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  Current: {movementThreshold.toFixed(2)} g
                </span>
              </div>

              {/* 3 Preset Pills */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSensitivityPreset('HIGH')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    movementThreshold <= 0.20
                      ? 'bg-blue-600 text-white border-blue-400 shadow'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  High (0.15g - Laptop on Desk)
                </button>
                <button
                  onClick={() => setSensitivityPreset('MEDIUM')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    movementThreshold > 0.20 && movementThreshold <= 0.40
                      ? 'bg-blue-600 text-white border-blue-400 shadow'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  Medium (0.30g - Backpack)
                </button>
                <button
                  onClick={() => setSensitivityPreset('LOW')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    movementThreshold > 0.40
                      ? 'bg-blue-600 text-white border-blue-400 shadow'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  Low (0.55g - Luggage / Transit)
                </button>
              </div>

              {/* Slider for continuous adjustment */}
              <div className="pt-2">
                <input
                  type="range"
                  min="0.05"
                  max="1.00"
                  step="0.05"
                  value={movementThreshold}
                  onChange={(e) => setMovementThreshold(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                  <span>0.05g (Ultra sensitive)</span>
                  <span>0.50g</span>
                  <span>1.00g (Heavy vibration only)</span>
                </div>
              </div>
            </div>
          </div>

          {/* GPS Tracking & Hardware Health Dual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GPS Telemetry Box */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">NEO-6M GPS Tracking</h3>
                    <p className="text-[10px] text-gray-400">UART2 Serial Bus (GPIO 16 RX2, GPIO 17 TX2)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  gpsValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {gpsValid ? `● FIXED (${telemetry?.gps?.satellites || 0} Sats)` : '🟠 SEARCHING SATELLITES'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Latitude:</span>
                  <span className="font-mono font-bold text-white">
                    {telemetry?.gps?.latitude ? `${telemetry.gps.latitude.toFixed(6)}°` : 'Searching...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Longitude:</span>
                  <span className="font-mono font-bold text-white">
                    {telemetry?.gps?.longitude ? `${telemetry.gps.longitude.toFixed(6)}°` : 'Searching...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Satellites Tracked:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {telemetry?.gps?.satellites || 0} Satellites
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCurrentTab('location')}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <span>OPEN FULL INTERACTIVE GPS MAP</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Hardware Node Status */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">ESP32 DevKit V1 Hardware</h3>
                    <p className="text-[10px] text-gray-400">Target UID: {deviceId}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isEsp32Connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {isEsp32Connected ? 'ONLINE ✓' : 'OFFLINE ✕'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Wi-Fi RSSI:</span>
                  <span className="font-mono font-bold text-white">
                    {isEsp32Connected ? `${telemetry?.wifi_rssi || -54} dBm` : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ESP32 Free Heap:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {isEsp32Connected && telemetry?.free_heap ? `${Math.round(telemetry.free_heap / 1024)} KB` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Heartbeat:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {isEsp32Connected ? (lastHeartbeatAgeSec === 0 ? 'Active Now' : `${lastHeartbeatAgeSec}s ago`) : 'No Signal'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveSection('hardware')}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <span>VIEW HARDWARE PAIRING & DIAGNOSTICS</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recent Belonging Events */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Belonging Movement Incidents ({belongingEvents.length})
              </h3>
              <button
                onClick={() => setCurrentTab('alerts')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <span>Full Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {belongingEvents.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No recent abnormal movement events on {belongingName}.
              </p>
            ) : (
              <div className="space-y-2">
                {belongingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        evt.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                      }`} />
                      <div>
                        <p className="font-bold text-gray-200">{evt.event_type}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{evt.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 ml-2 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW B: AREA SECURITY WORKSPACE                                       */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'area' && (
        <div className="space-y-6">
          {/* Main Area Security Card */}
          <div className={`rounded-3xl p-6 sm:p-7 border-2 transition-all shadow-2xl ${
            isAreaActive
              ? pirMotion
                ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 border-rose-500 shadow-rose-500/20 animate-pulse'
                : 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/90 border-blue-500/70 shadow-blue-500/10'
              : 'bg-gray-900/90 border-gray-800 shadow-black/40'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  isAreaActive ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <Radio className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      PERIMETER AREA PROTECTION
                    </span>
                    <span className="text-[10px] font-mono text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                      GPIO 13 PIR
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {areaName}
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-xl">
                    Monitored by <strong>HC-SR501 PIR sensor</strong> on digital GPIO 13. Detects human infrared body heat across room entrances.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border ${
                  isAreaActive
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${isAreaActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isAreaActive ? 'ARMED & MONITORING' : 'DISARMED (STANDBY)'}</span>
                </span>
              </div>
            </div>

            {/* Area Actions Strip */}
            <div className="mt-5 pt-4 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleToggleArea}
                disabled={isTogglingArea || (!isEsp32Connected && !isTestMode)}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider shadow-xl flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50 ${
                  !isEsp32Connected && !isTestMode
                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                    : isAreaActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-600/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/40'
                }`}
              >
                {!isEsp32Connected && !isTestMode ? (
                  <span>REAL HARDWARE NOT CONNECTED</span>
                ) : isTogglingArea ? (
                  <span>DISPATCHING COMMAND TO ESP32...</span>
                ) : isAreaActive ? (
                  <>
                    <ShieldOff className="w-5 h-5" />
                    <span>DISARM AREA SECURITY</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>ARM AREA SECURITY</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  stopSiren();
                  stopBuzzer();
                }}
                className="py-4 px-4 rounded-2xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-bold text-sm flex items-center justify-center space-x-2 transition"
              >
                <VolumeX className="w-5 h-5 text-rose-400" />
                <span>TURN OFF SIREN</span>
              </button>
            </div>
          </div>

          {/* PIR Sensor Telemetry Stream */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">HC-SR501 PIR Hardware Stream</h3>
                  <p className="text-xs text-gray-400">Digital Input on ESP32 GPIO 13</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                pirMotion
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {pirMotion ? '🚨 HUMAN MOTION DETECTED' : 'IDLE (PERIMETER CLEAR)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Digital Pin Level</span>
                <span className="text-lg font-mono font-bold text-white mt-1 block">
                  {pirMotion ? 'HIGH (3.3V)' : 'LOW (0.0V)'}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Triggered on infrared body heat</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Perimeter State</span>
                <span className={`text-lg font-mono font-bold mt-1 block ${isAreaActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {isAreaActive ? 'ACTIVE TRIPWIRE' : 'DISARMED'}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">ESP32 edge monitoring</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Local Buzzer</span>
                <span className={`text-lg font-mono font-bold mt-1 block ${isBuzzerSounding ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isBuzzerSounding ? 'SOUNDING 🚨' : 'READY (STANDBY)'}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">GPIO 23 active siren</span>
              </div>
            </div>
          </div>

          {/* Recent Area Intrusion Incidents */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Perimeter Intrusion History ({areaEvents.length})
            </h3>
            {areaEvents.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No intrusions detected in {areaName}.</p>
            ) : (
              <div className="space-y-2">
                {areaEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <div>
                        <p className="font-bold text-gray-200">{evt.event_type}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{evt.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 ml-2 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW C: CONNECT HARDWARE & PAIRING WORKSPACE                          */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'hardware' && (
        <div className="space-y-6">
          {/* Hardware Connection Master Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl border ${
                  isEsp32Connected
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse'
                }`}>
                  <Cpu className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">ESP32 DevKit V1 (ESP-WROOM-32)</h2>
                  <p className="text-xs font-mono text-gray-400">Node ID: {deviceId}</p>
                </div>
              </div>
              <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                isEsp32Connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isEsp32Connected ? 'HARDWARE ONLINE ✓' : 'REAL HARDWARE NOT CONNECTED ✕'}
              </span>
            </div>

            {/* Diagnostic Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80">
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>HEARTBEAT</span>
                </div>
                <p className="text-sm font-mono font-bold text-white mt-1">
                  {isEsp32Connected ? (lastHeartbeatAgeSec === 0 ? 'Active now' : `${lastHeartbeatAgeSec}s ago`) : 'Disconnected'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80">
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span>LATENCY</span>
                </div>
                <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  {isEsp32Connected ? (serverLatencyMs > 0 ? `${serverLatencyMs}ms` : '< 5ms') : '--'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80">
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
                  <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                  <span>WI-FI RSSI</span>
                </div>
                <p className="text-sm font-mono font-bold text-white mt-1">
                  {isEsp32Connected ? `${telemetry?.wifi_rssi || -54} dBm` : '--'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80">
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>FREE HEAP</span>
                </div>
                <p className="text-sm font-mono font-bold text-cyan-400 mt-1">
                  {isEsp32Connected && telemetry?.free_heap ? `${Math.round(telemetry.free_heap / 1024)} KB` : '--'}
                </p>
              </div>
            </div>

            {/* Communication Layers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="font-bold text-gray-200">Aedes MQTT Broker (:1883)</p>
                    <p className="text-[10px] text-gray-400 font-mono">Topics: securebelong/device/{deviceId}/*</p>
                  </div>
                </div>
                <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 text-[11px] font-mono">
                  PORT 1883
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-bold text-gray-200">Socket.io WebSocket Stream</p>
                    <p className="text-[10px] text-gray-400 font-mono">Bi-directional push events</p>
                  </div>
                </div>
                <span className={`font-bold px-2.5 py-1 rounded border text-[11px] font-mono ${
                  isSocketConnected ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30' : 'text-rose-400 bg-rose-950/60 border-rose-500/30'
                }`}>
                  {isSocketConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Device Registration & Asset Pairing Form */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-gray-800 pb-3">
              <Link2 className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-black text-white">Pair Hardware Node to Protected Asset</h3>
                <p className="text-xs text-gray-400">Associate ESP32-SECURITY-001 with your laptop, backpack, or asset</p>
              </div>
            </div>

            {pairSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{pairSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Hardware Node UID
                  </label>
                  <input
                    type="text"
                    required
                    value={pairDevId}
                    onChange={(e) => setPairDevId(e.target.value)}
                    placeholder="ESP32-SECURITY-001"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Protected Asset Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pairAssetName}
                    onChange={(e) => setPairAssetName(e.target.value)}
                    placeholder="e.g. My Laptop, ThinkPad X1, Travel Bag"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Asset Category
                  </label>
                  <select
                    value={pairAssetType}
                    onChange={(e) => setPairAssetType(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="LAPTOP">Laptop / Computer</option>
                    <option value="BACKPACK">Backpack / Bag</option>
                    <option value="LUGGAGE">Suitcase / Luggage</option>
                    <option value="VEHICLE">Bicycle / Vehicle</option>
                    <option value="OTHER">Other Valuable</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isPairing}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isPairing ? 'SAVING PAIRING...' : 'SAVE & PAIR DEVICE'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Physical Wiring Pinout Table */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              ESP32 DevKit V1 Hardware Pinout Reference
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-300 font-mono">
                <thead className="bg-gray-950 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Module Pin</th>
                    <th className="py-2.5 px-3">ESP32 Pin</th>
                    <th className="py-2.5 px-3">Function</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">MPU6050 IMU</td>
                    <td className="py-2.5 px-3">SDA / SCL</td>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold">GPIO 21 / GPIO 22</td>
                    <td className="py-2.5 px-3 text-gray-400">Hardware I2C Motion Tripwire</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">HC-SR501 PIR</td>
                    <td className="py-2.5 px-3">OUT</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">GPIO 13</td>
                    <td className="py-2.5 px-3 text-gray-400">Perimeter Intrusion Detection</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">NEO-6M GPS</td>
                    <td className="py-2.5 px-3">TX / RX</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">GPIO 16 (RX2) / GPIO 17 (TX2)</td>
                    <td className="py-2.5 px-3 text-gray-400">UART2 Serial GPS Positioning</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">5V Active Buzzer</td>
                    <td className="py-2.5 px-3">VCC (+)</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">GPIO 23</td>
                    <td className="py-2.5 px-3 text-gray-400">Local High-Decibel Siren</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW D: SECURITY OVERVIEW WORKSPACE                                   */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Master Overview Banner */}
          <div className={`rounded-3xl p-6 border-2 transition-all shadow-2xl ${
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
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
                  OVERALL SECURITY STATUS
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-xs font-mono text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{isEsp32Connected ? (lastHeartbeatAgeSec === 0 ? 'Live Sync' : `${lastHeartbeatAgeSec}s ago`) : 'Offline'}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-2">
                  {overallStatus === 'ALERT' && <span>🔴 SECURITY ALERT ACTIVE</span>}
                  {overallStatus === 'WARNING' && <span>🟠 MOVEMENT DETECTED</span>}
                  {overallStatus === 'SECURE' && <span>🟢 ALL SYSTEMS SECURE</span>}
                  {overallStatus === 'OFFLINE' && <span>⚫ HARDWARE DISCONNECTED</span>}
                  {overallStatus === 'STANDBY' && <span>⚪ STANDBY (DISARMED)</span>}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  {statusMessage}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-gray-700/60 flex-shrink-0 ml-3">
                {overallStatus === 'ALERT' ? (
                  <ShieldAlert className="w-8 h-8 text-rose-400" />
                ) : overallStatus === 'SECURE' ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                ) : (
                  <ShieldOff className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* 4 Security Modes Selection Grid */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Security Mode Presets</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                CURRENT: {currentSecurityMode}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleModeSelect('HOME')}
                disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
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
                <p className="text-[10px] text-gray-400 mt-0.5">Area ON • Bag OFF</p>
              </button>

              <button
                onClick={() => handleModeSelect('AWAY')}
                disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
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
                <p className="text-[10px] text-gray-400 mt-0.5">Area ON • Bag ON</p>
              </button>

              <button
                onClick={() => handleModeSelect('TRAVEL')}
                disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
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
                <p className="text-[10px] text-gray-400 mt-0.5">Bag ON • GPS ON</p>
              </button>

              <button
                onClick={() => handleModeSelect('EMERGENCY')}
                disabled={isSettingMode || (!isEsp32Connected && !isTestMode)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  currentSecurityMode === 'EMERGENCY'
                    ? 'bg-rose-600/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                    : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <AlertOctagon className={`w-4 h-4 ${currentSecurityMode === 'EMERGENCY' ? 'text-rose-400' : 'text-gray-500'}`} />
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${currentSecurityMode === 'EMERGENCY' ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    MAX SIREN
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-2">Emergency</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Immediate Alarm</p>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Security Score</span>
              <div className="my-2">
                <span className="text-2xl font-black font-mono text-emerald-400">{securityScore}</span>
                <span className="text-xs text-gray-500 font-mono"> / 100</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${securityScore}%` }} />
              </div>
            </div>

            <div 
              onClick={() => toggleSilentMode()}
              className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Covert Mode</span>
              <div className="my-2 flex items-center space-x-2">
                {isSilent ? <EyeOff className="w-5 h-5 text-purple-400" /> : <Eye className="w-5 h-5 text-blue-400" />}
                <span className="text-sm font-bold text-white">{isSilent ? 'Silent 🔕' : 'Audible 🔔'}</span>
              </div>
              <span className="text-[10px] text-gray-500">Tap to toggle</span>
            </div>

            <div 
              onClick={() => setCurrentTab('location')}
              className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GPS Fix</span>
              <div className="my-2 flex items-center space-x-1.5">
                <Compass className={`w-5 h-5 ${gpsValid ? 'text-blue-400' : 'text-amber-400'}`} />
                <span className={`text-sm font-bold ${gpsValid ? 'text-blue-400' : 'text-amber-400'}`}>
                  {gpsValid ? `${telemetry?.gps?.satellites || 0} Sats Fixed` : 'Searching'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">View map →</span>
            </div>

            <div 
              onClick={() => setCurrentTab('alerts')}
              className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition cursor-pointer flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Audit Incidents</span>
              <div className="my-2 flex items-center space-x-2">
                <BellRing className={`w-5 h-5 ${alerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span className="text-xl font-bold text-white">{alerts.length}</span>
              </div>
              <span className="text-[10px] text-gray-500">View logs →</span>
            </div>
          </div>

          {/* Master Activity Timeline */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Master Activity Timeline</h3>
              <button
                onClick={() => setCurrentTab('alerts')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <span>Full Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No security events logged.</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        evt.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' : evt.severity === 'HIGH' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div>
                        <p className="font-bold text-gray-200">{evt.event_type}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{evt.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 ml-2 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                  placeholder="e.g. My Laptop, ThinkPad, Backpack"
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
