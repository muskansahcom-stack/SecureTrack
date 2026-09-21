import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Device,
  ProtectedAsset,
  DeviceSettings,
  Telemetry,
  Alert,
  EventLog,
  GPSPoint,
  SecurityModeType,
  CommandAuditItem,
  SensorHealthStatus,
  SecurityEvent
} from '../types/index.js';
import { api, API_BASE_URL } from '../api/client.js';

export type PoliceSirenMode = 'CRUISER' | 'WAIL' | 'YELP' | 'PIERCER' | 'HILO';

interface DeviceContextType {
  deviceId: string;
  setDeviceId: (id: string) => void;
  deviceName: string;
  setDeviceName: (name: string) => void;
  isTestMode: boolean;
  setTestMode: (enabled: boolean) => void;

  // Real Hardware & Protected Assets
  device: Device | null;
  assets: ProtectedAsset[];
  activeAsset: ProtectedAsset | null;
  settings: DeviceSettings | null;
  telemetry: Telemetry | null;
  alerts: Alert[];
  events: EventLog[];
  activeAlert: Alert | null;
  setActiveAlert: (a: Alert | null) => void;
  routeHistory: GPSPoint[];

  // Real Hardware Security & Health
  currentSecurityMode: SecurityModeType;
  securityScore: number;
  sensorHealth: SensorHealthStatus;
  isAreaActive: boolean;
  isBelongingActive: boolean;
  isArmed: boolean;

  // Real Connection & Diagnostics
  isSocketConnected: boolean;
  isEsp32Connected: boolean;
  lastHeartbeatAgeSec: number;
  serverLatencyMs: number;
  latestCommandStatus: CommandAuditItem | null;
  commandHistory: CommandAuditItem[];

  // Protected Asset & Hardware Controls
  pairDeviceAsset: (deviceId: string, assetName: string, assetType?: string, protectionMode?: string) => Promise<void>;
  armAsset: (assetId: string) => Promise<void>;
  disarmAsset: (assetId: string) => Promise<void>;
  armProtection: () => Promise<void>;
  disarmProtection: () => Promise<void>;
  stopSiren: () => Promise<void>;

  // Security Mode Presets
  setSecurityMode: (mode: SecurityModeType) => Promise<void>;

  // Independent Security Controls
  turnOnAreaSecurity: () => Promise<void>;
  turnOffAreaSecurity: () => Promise<void>;
  turnOnBelongingSecurity: () => Promise<void>;
  turnOffBelongingSecurity: () => Promise<void>;
  updateCustomNames: (areaName: string, belongingName: string) => Promise<void>;

  // Hardware Controls
  armSystem: () => Promise<void>;
  disarmSystem: () => Promise<void>;
  activateBuzzer: () => Promise<void>;
  stopBuzzer: () => Promise<void>;
  toggleSilentMode: () => Promise<void>;
  requestGPSUpdate: () => Promise<void>;

  // Calibration & Configuration
  setSensitivityPreset: (preset: 'LOW' | 'MEDIUM' | 'HIGH') => Promise<void>;
  setMovementThreshold: (threshold: number) => Promise<void>;
  setAlarmDuration: (durationSec: number) => Promise<void>;
  updateSettings: (updates: Partial<DeviceSettings>) => Promise<void>;

  // Alert & Audit Management
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  clearAlerts: () => Promise<void>;
  clearEvents: () => Promise<void>;
  triggerTestAlert: (type: 'MOTION' | 'INTRUSION') => Promise<void>;
  refreshData: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// ============================================================================
// AUTHENTIC POLICE CRUISER SIREN & EMERGENCY ACOUSTIC SYNTHESIZER
// ============================================================================
class PoliceEmergencySirenEngine {
  private ctx: AudioContext | null = null;
  private isSirenRunning: boolean = false;
  private currentMode: PoliceSirenMode = 'CRUISER';
  private currentVolume: number = 0.85;

  private oscPrimary: OscillatorNode | null = null;
  private oscSecondary: OscillatorNode | null = null;
  private oscSubHorn: OscillatorNode | null = null;
  private oscTweeter: OscillatorNode | null = null;

  private lfoPrimary: OscillatorNode | null = null;
  private lfoPrimaryGain: GainNode | null = null;
  private lfoSecondaryGain: GainNode | null = null;

  private lfoFast: OscillatorNode | null = null;
  private lfoFastGain: GainNode | null = null;

  private masterGain: GainNode | null = null;
  private hornFilter1: BiquadFilterNode | null = null;
  private hornFilter2: BiquadFilterNode | null = null;
  private hornFilter3: BiquadFilterNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private makeHornCurve(amount: number = 18) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  public isRunning(): boolean {
    return this.isSirenRunning;
  }

  public getMode(): PoliceSirenMode {
    return this.currentMode;
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.currentVolume * 2.8, this.ctx.currentTime);
    }
  }

  public startLoudSiren(mode: PoliceSirenMode = 'CRUISER') {
    this.initContext();
    if (!this.ctx) return;

    if (this.isSirenRunning) {
      this.stopLoudSiren();
    }

    try {
      this.isSirenRunning = true;
      this.currentMode = mode;
      const now = this.ctx.currentTime;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, now);
      this.compressor.knee.setValueAtTime(4, now);
      this.compressor.ratio.setValueAtTime(14, now);
      this.compressor.attack.setValueAtTime(0.002, now);
      this.compressor.release.setValueAtTime(0.05, now);
      this.compressor.connect(this.ctx.destination);

      this.hornFilter1 = this.ctx.createBiquadFilter();
      this.hornFilter1.type = 'peaking';
      this.hornFilter1.frequency.setValueAtTime(2800, now);
      this.hornFilter1.Q.setValueAtTime(2.0, now);
      this.hornFilter1.gain.setValueAtTime(12.0, now);
      this.hornFilter1.connect(this.compressor);

      this.hornFilter2 = this.ctx.createBiquadFilter();
      this.hornFilter2.type = 'peaking';
      this.hornFilter2.frequency.setValueAtTime(1150, now);
      this.hornFilter2.Q.setValueAtTime(1.8, now);
      this.hornFilter2.gain.setValueAtTime(10.0, now);
      this.hornFilter2.connect(this.hornFilter1);

      this.hornFilter3 = this.ctx.createBiquadFilter();
      this.hornFilter3.type = 'lowpass';
      this.hornFilter3.frequency.setValueAtTime(5500, now);
      this.hornFilter3.Q.setValueAtTime(0.7, now);
      this.hornFilter3.connect(this.hornFilter2);

      this.waveShaper = this.ctx.createWaveShaper();
      this.waveShaper.curve = this.makeHornCurve(16);
      this.waveShaper.oversample = '4x';
      this.waveShaper.connect(this.hornFilter3);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.01, now);
      this.masterGain.gain.linearRampToValueAtTime(this.currentVolume * 2.8, now + 0.08);
      this.masterGain.connect(this.waveShaper);

      if (mode === 'WAIL' || mode === 'CRUISER') {
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'sawtooth';
        this.oscPrimary.frequency.setValueAtTime(1050, now);

        this.oscSecondary = this.ctx.createOscillator();
        this.oscSecondary.type = 'square';
        this.oscSecondary.frequency.setValueAtTime(1058, now);

        this.oscSubHorn = this.ctx.createOscillator();
        this.oscSubHorn.type = 'triangle';
        this.oscSubHorn.frequency.setValueAtTime(260, now);

        this.oscTweeter = this.ctx.createOscillator();
        this.oscTweeter.type = 'sawtooth';
        this.oscTweeter.frequency.setValueAtTime(3150, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'triangle';
        this.lfoPrimary.frequency.setValueAtTime(0.25, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(500, now);
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);

        this.lfoSecondaryGain = this.ctx.createGain();
        this.lfoSecondaryGain.gain.setValueAtTime(510, now);
        this.lfoPrimary.connect(this.lfoSecondaryGain);
        this.lfoSecondaryGain.connect(this.oscSecondary.frequency);
        this.lfoSecondaryGain.connect(this.oscTweeter.frequency);

        if (mode === 'CRUISER') {
          this.lfoFast = this.ctx.createOscillator();
          this.lfoFast.type = 'sawtooth';
          this.lfoFast.frequency.setValueAtTime(3.6, now);

          this.lfoFastGain = this.ctx.createGain();
          this.lfoFastGain.gain.setValueAtTime(120, now);
          this.lfoFast.connect(this.lfoFastGain);
          this.lfoFastGain.connect(this.oscSubHorn.frequency);
          this.lfoFast.start(now);
        }

        this.oscPrimary.connect(this.masterGain);
        this.oscSecondary.connect(this.masterGain);
        this.oscSubHorn.connect(this.masterGain);
        this.oscTweeter.connect(this.masterGain);

        this.oscPrimary.start(now);
        this.oscSecondary.start(now);
        this.oscSubHorn.start(now);
        this.oscTweeter.start(now);
        this.lfoPrimary.start(now);
      } else if (mode === 'YELP') {
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'sawtooth';
        this.oscPrimary.frequency.setValueAtTime(1150, now);

        this.oscSecondary = this.ctx.createOscillator();
        this.oscSecondary.type = 'square';
        this.oscSecondary.frequency.setValueAtTime(1160, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'sawtooth';
        this.lfoPrimary.frequency.setValueAtTime(3.6, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(500, now);
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);
        this.lfoPrimaryGain.connect(this.oscSecondary.frequency);

        this.oscPrimary.connect(this.masterGain);
        this.oscSecondary.connect(this.masterGain);

        this.oscPrimary.start(now);
        this.oscSecondary.start(now);
        this.lfoPrimary.start(now);
      } else if (mode === 'PIERCER') {
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'sawtooth';
        this.oscPrimary.frequency.setValueAtTime(1250, now);

        this.oscSecondary = this.ctx.createOscillator();
        this.oscSecondary.type = 'sawtooth';
        this.oscSecondary.frequency.setValueAtTime(2500, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'sawtooth';
        this.lfoPrimary.frequency.setValueAtTime(9.5, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(550, now);
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);

        this.oscPrimary.connect(this.masterGain);
        this.oscSecondary.connect(this.masterGain);

        this.oscPrimary.start(now);
        this.oscSecondary.start(now);
        this.lfoPrimary.start(now);
      } else if (mode === 'HILO') {
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'square';
        this.oscPrimary.frequency.setValueAtTime(800, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'square';
        this.lfoPrimary.frequency.setValueAtTime(1.6, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(140, now);
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);

        this.oscPrimary.connect(this.masterGain);
        this.oscPrimary.start(now);
        this.lfoPrimary.start(now);
      }
    } catch (e) {
      console.warn('[Audio] Error starting police siren:', e);
    }
  }

  public stopLoudSiren() {
    if (!this.isSirenRunning || !this.ctx) return;
    try {
      this.isSirenRunning = false;
      const now = this.ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      }
      setTimeout(() => {
        try {
          if (this.oscPrimary) { this.oscPrimary.stop(); this.oscPrimary.disconnect(); this.oscPrimary = null; }
          if (this.oscSecondary) { this.oscSecondary.stop(); this.oscSecondary.disconnect(); this.oscSecondary = null; }
          if (this.oscSubHorn) { this.oscSubHorn.stop(); this.oscSubHorn.disconnect(); this.oscSubHorn = null; }
          if (this.oscTweeter) { this.oscTweeter.stop(); this.oscTweeter.disconnect(); this.oscTweeter = null; }
          if (this.lfoPrimary) { this.lfoPrimary.stop(); this.lfoPrimary.disconnect(); this.lfoPrimary = null; }
          if (this.lfoPrimaryGain) { this.lfoPrimaryGain.disconnect(); this.lfoPrimaryGain = null; }
          if (this.lfoSecondaryGain) { this.lfoSecondaryGain.disconnect(); this.lfoSecondaryGain = null; }
          if (this.lfoFast) { this.lfoFast.stop(); this.lfoFast.disconnect(); this.lfoFast = null; }
          if (this.lfoFastGain) { this.lfoFastGain.disconnect(); this.lfoFastGain = null; }
          if (this.masterGain) { this.masterGain.disconnect(); this.masterGain = null; }
          if (this.waveShaper) { this.waveShaper.disconnect(); this.waveShaper = null; }
          if (this.hornFilter1) { this.hornFilter1.disconnect(); this.hornFilter1 = null; }
          if (this.hornFilter2) { this.hornFilter2.disconnect(); this.hornFilter2 = null; }
          if (this.hornFilter3) { this.hornFilter3.disconnect(); this.hornFilter3 = null; }
          if (this.compressor) { this.compressor.disconnect(); this.compressor = null; }
        } catch (_) {}
      }, 50);
    } catch (e) {
      this.isSirenRunning = false;
    }
  }

  public playTone(type: 'CRITICAL' | 'HIGH' | 'CHIRP' | 'POLICE_BURST' | 'HORN') {
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-18, now);
      comp.ratio.setValueAtTime(20, now);
      comp.connect(this.ctx.destination);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(3000, now);
      filter.gain.setValueAtTime(14.0, now);
      filter.connect(comp);

      osc.connect(gain);
      gain.connect(filter);

      if (type === 'CRITICAL' || type === 'POLICE_BURST') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(1750, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.50);
        gain.gain.setValueAtTime(this.currentVolume * 3.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
      } else if (type === 'HORN') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(this.currentVolume * 3.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'HIGH') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(1650, now + 0.16);
        gain.gain.setValueAtTime(this.currentVolume * 2.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.30);
        osc.start(now);
        osc.stop(now + 0.30);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.08);
        gain.gain.setValueAtTime(this.currentVolume * 1.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }
}

export const alarmAudio = new PoliceEmergencySirenEngine();

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceIdState] = useState<string>(
    localStorage.getItem('securebelong_device_id') || 'ESP32-SECURITY-001'
  );
  const [deviceName, setDeviceNameState] = useState<string>(
    localStorage.getItem('securebelong_device_name') || 'Personal Belonging Unit 1'
  );
  const [isTestMode, setIsTestModeState] = useState<boolean>(false);

  const [device, setDevice] = useState<Device | null>(null);
  const [assets, setAssets] = useState<ProtectedAsset[]>([]);
  const [activeAsset, setActiveAsset] = useState<ProtectedAsset | null>(null);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [routeHistory, setRouteHistory] = useState<GPSPoint[]>([]);

  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [lastHeartbeatAgeSec, setLastHeartbeatAgeSec] = useState<number>(0);
  const [serverLatencyMs, setServerLatencyMs] = useState<number>(0);

  const [latestCommandStatus, setLatestCommandStatus] = useState<CommandAuditItem | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandAuditItem[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(0);
  const lastMpuTimeRef = useRef<number>(0);

  const setDeviceId = (id: string) => {
    setDeviceIdState(id);
    localStorage.setItem('securebelong_device_id', id);
  };

  const setDeviceName = (name: string) => {
    setDeviceNameState(name);
    localStorage.setItem('securebelong_device_name', name);
  };

  const setTestMode = (enabled: boolean) => {
    setIsTestModeState(enabled);
  };

  const trackCommand = (cmdName: string, status: 'SENDING' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED', msg?: string) => {
    const item: CommandAuditItem = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      command: cmdName,
      target_device: deviceId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status,
      response_message: msg,
    };
    setLatestCommandStatus(item);
    setCommandHistory((prev) => [item, ...prev.slice(0, 19)]);
    return item;
  };

  // Fetch initial REST data
  const refreshData = useCallback(async () => {
    try {
      const startTime = Date.now();
      const [statusRes, assetsRes, alertsRes, eventsRes, settingsRes, routeRes] = await Promise.allSettled([
        api.getDeviceStatus(deviceId),
        api.getProtectedAssets(),
        api.getAlerts(deviceId),
        api.getEvents(deviceId),
        api.getDeviceSettings(deviceId),
        api.getGPSRoute(deviceId, 100),
      ]);

      setServerLatencyMs(Date.now() - startTime);

      if (statusRes.status === 'fulfilled' && statusRes.value.data) {
        setDevice(statusRes.value.data.device);
        if (statusRes.value.data.latestTelemetry) {
          setTelemetry(statusRes.value.data.latestTelemetry);
        }
        if (statusRes.value.data.device?.last_seen) {
          const lastSeenMs = new Date(statusRes.value.data.device.last_seen).getTime();
          lastHeartbeatTimeRef.current = lastSeenMs;
          const age = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
          setLastHeartbeatAgeSec(age);
        }
      }

      if (assetsRes.status === 'fulfilled' && Array.isArray(assetsRes.value.data)) {
        setAssets(assetsRes.value.data);
        const match = assetsRes.value.data.find((a: ProtectedAsset) => a.device_id === deviceId);
        setActiveAsset(match || assetsRes.value.data[0] || null);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setSettings(settingsRes.value.data);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value.data)) {
        setAlerts(alertsRes.value.data);
      }

      if (eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value.data)) {
        setEvents(eventsRes.value.data);
      }

      if (routeRes.status === 'fulfilled' && Array.isArray(routeRes.value.data)) {
        setRouteHistory(routeRes.value.data);
      }
    } catch (err) {
      console.warn('Error fetching device data:', err);
    }
  }, [deviceId]);

  // Real Hardware WebSocket Connection
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to SecureBelong Gateway');
      setIsSocketConnected(true);
      socket.emit('join:device', deviceId);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected from SecureBelong Gateway');
      setIsSocketConnected(false);
    });

    // Real-Time Telemetry Stream from Hardware
    socket.on('device:telemetry', (data: Telemetry) => {
      if (data.device_id === deviceId) {
        setTelemetry(data);
        lastHeartbeatTimeRef.current = Date.now();
        lastMpuTimeRef.current = Date.now();
        setLastHeartbeatAgeSec(0);

        setDevice((prev) => (prev ? { ...prev, is_online: 1, last_seen: data.timestamp } : prev));

        if ((data.buzzer_active || (data.belonging_security_enabled && data.mpu?.motion_detected) || (data.area_security_enabled && data.pir?.motion)) && settings?.silent_mode !== 1) {
          alarmAudio.startLoudSiren();
        }

        if (data.gps?.valid && data.gps.latitude && data.gps.longitude) {
          setRouteHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.latitude === data.gps.latitude && last.longitude === data.gps.longitude) {
              return prev;
            }
            const newPoint: GPSPoint = {
              latitude: data.gps.latitude!,
              longitude: data.gps.longitude!,
              altitude: data.gps.altitude,
              speed: data.gps.speed,
              timestamp: data.timestamp || new Date().toISOString(),
            };
            return [...prev.slice(-99), newPoint];
          });
        }
      }
    });

    // Real Security Alerts & Movement Events
    socket.on('device:alert', (alert: Alert) => {
      if (alert.device_id === deviceId) {
        setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
        setActiveAlert(alert);
        if (settings?.silent_mode !== 1) {
          alarmAudio.startLoudSiren();
        } else {
          alarmAudio.playTone('CRITICAL');
        }
      }
    });

    socket.on('device:status', (statusUpdate: Partial<Device> & { device_id: string }) => {
      if (statusUpdate.device_id === deviceId) {
        setDevice((prev) => (prev ? { ...prev, ...statusUpdate } : (statusUpdate as Device)));
        if (statusUpdate.last_seen) {
          lastHeartbeatTimeRef.current = new Date(statusUpdate.last_seen).getTime();
          setLastHeartbeatAgeSec(0);
        }
      }
    });

    socket.on('asset:update', (updatedAsset: ProtectedAsset) => {
      setAssets((prev) => {
        const filtered = prev.filter((a) => a.id !== updatedAsset.id);
        return [updatedAsset, ...filtered];
      });
      if (activeAsset?.id === updatedAsset.id || updatedAsset.device_id === deviceId) {
        setActiveAsset(updatedAsset);
      }
    });

    socket.on('device:command_ack', (ack: any) => {
      console.log('[Command Ack from ESP32]', ack);
      alarmAudio.playTone('CHIRP');
      if (latestCommandStatus) {
        setLatestCommandStatus((prev) => (prev ? { ...prev, status: 'ACKNOWLEDGED' } : null));
      }
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceId, refreshData, settings?.silent_mode, activeAsset?.id, latestCommandStatus]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real Heartbeat Age Monitor
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastHeartbeatTimeRef.current > 0) {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - lastHeartbeatTimeRef.current) / 1000));
        setLastHeartbeatAgeSec(elapsedSec);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Strict Real Hardware Connectivity (Zero Fake Fallback)
  const isEsp32Connected = Boolean(
    device?.is_online === 1 &&
    lastHeartbeatTimeRef.current > 0 &&
    (Date.now() - lastHeartbeatTimeRef.current) < 15000
  );

  const isAreaActive = settings?.area_security_enabled === 1 || telemetry?.area_security_enabled === true;
  const isBelongingActive = activeAsset?.armed === 1 || activeAsset?.armed === true || settings?.belonging_security_enabled === 1 || telemetry?.belonging_security_enabled === true;
  const isArmed = isBelongingActive || isAreaActive;

  // Real Protected Asset Controls
  const pairDeviceAsset = async (devUid: string, assetName: string, assetType = 'LAPTOP', protectionMode = 'PERSONAL_BELONGING') => {
    trackCommand('PAIR_DEVICE_ASSET', 'SENDING', `Pairing ${devUid} with ${assetName}`);
    try {
      const res = await api.pairDeviceAsset({
        device_id: devUid,
        asset_name: assetName,
        asset_type: assetType,
        protection_mode: protectionMode,
      });
      setDeviceId(devUid);
      setDeviceName(`Security Unit (${assetName})`);
      if (res.data?.asset) {
        setActiveAsset(res.data.asset);
      }
      await refreshData();
      trackCommand('PAIR_DEVICE_ASSET', 'ACKNOWLEDGED', 'Device paired successfully');
    } catch (err: any) {
      trackCommand('PAIR_DEVICE_ASSET', 'FAILED', err.message);
      throw err;
    }
  };

  const armAsset = async (assetId: string) => {
    trackCommand('ARM_PROTECTION', 'SENDING');
    alarmAudio.playTone('CHIRP');
    try {
      await api.armAsset(assetId);
      await refreshData();
      trackCommand('ARM_PROTECTION', 'SENT', 'ARM command sent to ESP32');
    } catch (err: any) {
      trackCommand('ARM_PROTECTION', 'FAILED', err.message);
    }
  };

  const disarmAsset = async (assetId: string) => {
    trackCommand('DISARM_PROTECTION', 'SENDING');
    alarmAudio.playTone('CHIRP');
    alarmAudio.stopLoudSiren();
    try {
      await api.disarmAsset(assetId);
      await refreshData();
      trackCommand('DISARM_PROTECTION', 'SENT', 'DISARM command sent to ESP32');
    } catch (err: any) {
      trackCommand('DISARM_PROTECTION', 'FAILED', err.message);
    }
  };

  const armProtection = async () => {
    if (activeAsset) {
      await armAsset(activeAsset.id);
    } else {
      await turnOnBelongingSecurity();
    }
  };

  const disarmProtection = async () => {
    if (activeAsset) {
      await disarmAsset(activeAsset.id);
    } else {
      await turnOffBelongingSecurity();
    }
  };

  const stopSiren = async () => {
    trackCommand('STOP_SIREN', 'SENDING');
    alarmAudio.stopLoudSiren();
    alarmAudio.playTone('CHIRP');
    try {
      await api.stopSiren(deviceId);
      if (activeAlert) {
        await api.acknowledgeAlert(activeAlert.id);
        setActiveAlert(null);
      }
      await refreshData();
      trackCommand('STOP_SIREN', 'ACKNOWLEDGED', 'Physical siren and web alarm silenced');
    } catch (err: any) {
      trackCommand('STOP_SIREN', 'FAILED', err.message);
    }
  };

  const turnOnAreaSecurity = async () => {
    trackCommand('ARM_AREA_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    setSettings((prev) => (prev ? { ...prev, area_security_enabled: 1 } : null));
    await api.armAreaSecurity(deviceId);
    await refreshData();
  };

  const turnOffAreaSecurity = async () => {
    trackCommand('DISARM_AREA_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    alarmAudio.stopLoudSiren();
    setSettings((prev) => (prev ? { ...prev, area_security_enabled: 0 } : null));
    await api.disarmAreaSecurity(deviceId);
    await refreshData();
  };

  const turnOnBelongingSecurity = async () => {
    trackCommand('ARM_BELONGING_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    setSettings((prev) => (prev ? { ...prev, belonging_security_enabled: 1 } : null));
    await api.armPersonalSecurity(deviceId);
    await refreshData();
  };

  const turnOffBelongingSecurity = async () => {
    trackCommand('DISARM_BELONGING_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    alarmAudio.stopLoudSiren();
    setSettings((prev) => (prev ? { ...prev, belonging_security_enabled: 0 } : null));
    await api.disarmPersonalSecurity(deviceId);
    await refreshData();
  };

  const updateCustomNames = async (areaName: string, belongingName: string) => {
    setSettings((prev) => (prev ? { ...prev, area_name: areaName, belonging_name: belongingName } : null));
    await api.updateDeviceSettings(deviceId, { area_name: areaName, belonging_name: belongingName });
    await refreshData();
  };

  const armSystem = async () => {
    await armProtection();
  };

  const disarmSystem = async () => {
    await disarmProtection();
  };

  const activateBuzzer = async () => {
    trackCommand('ACTIVATE_BUZZER', 'SENDING');
    alarmAudio.startLoudSiren();
    await api.turnBuzzerOn(deviceId);
    await refreshData();
  };

  const stopBuzzer = async () => {
    await stopSiren();
  };

  const toggleSilentMode = async () => {
    const newSilent = settings?.silent_mode === 1 ? 0 : 1;
    setSettings((prev) => (prev ? { ...prev, silent_mode: newSilent } : null));
    if (newSilent === 1) {
      alarmAudio.stopLoudSiren();
    }
    await api.updateDeviceSettings(deviceId, { silent_mode: newSilent });
    await refreshData();
  };

  const requestGPSUpdate = async () => {
    trackCommand('REQUEST_GPS', 'SENDING');
    await api.requestGPS(deviceId);
  };

  const setSecurityMode = async (mode: SecurityModeType) => {
    trackCommand(`SET_MODE_${mode}`, 'SENDING');
    alarmAudio.playTone('CHIRP');
    await api.setSecurityMode(deviceId, mode);
    await refreshData();
  };

  const setSensitivityPreset = async (preset: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const threshold = preset === 'LOW' ? 0.55 : preset === 'HIGH' ? 0.15 : 0.30;
    await setMovementThreshold(threshold);
  };

  const setMovementThreshold = async (threshold: number) => {
    setSettings((prev) => (prev ? { ...prev, movement_threshold: threshold } : null));
    await api.updateDeviceSettings(deviceId, { movement_threshold: threshold });
  };

  const setAlarmDuration = async (durationSec: number) => {
    setSettings((prev) => (prev ? { ...prev, alarm_duration_sec: durationSec } : null));
    await api.updateDeviceSettings(deviceId, { alarm_duration_sec: durationSec });
  };

  const updateSettings = async (updates: Partial<DeviceSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
    await api.updateDeviceSettings(deviceId, updates);
    await refreshData();
  };

  const acknowledgeAlert = async (alertId: string) => {
    alarmAudio.stopLoudSiren();
    await api.acknowledgeAlert(alertId);
    setActiveAlert(null);
    await refreshData();
  };

  const resolveAlert = async (alertId: string) => {
    alarmAudio.stopLoudSiren();
    await api.resolveAlert(alertId);
    setActiveAlert(null);
    await refreshData();
  };

  const clearAlerts = async () => {
    alarmAudio.stopLoudSiren();
    await api.clearAlerts(deviceId);
    setAlerts([]);
    setActiveAlert(null);
  };

  const clearEvents = async () => {
    await api.clearEvents(deviceId);
    setEvents([]);
  };

  const triggerTestAlert = async (type: 'MOTION' | 'INTRUSION') => {
    alarmAudio.startLoudSiren();
    await refreshData();
  };

  // Determine current active security mode
  let currentSecurityMode: SecurityModeType = settings?.security_mode || 'CUSTOM';
  if (isAreaActive && isBelongingActive) {
    currentSecurityMode = telemetry?.buzzer_active ? 'EMERGENCY' : 'AWAY';
  } else if (isAreaActive && !isBelongingActive) {
    currentSecurityMode = 'HOME';
  } else if (!isAreaActive && isBelongingActive) {
    currentSecurityMode = 'TRAVEL';
  }

  // Real Sensor Health Status
  const isMpuOk = isEsp32Connected && (Date.now() - lastMpuTimeRef.current) < 20000;
  const isPirOk = isEsp32Connected && settings?.pir_enabled !== 0;
  const isGpsOk = isEsp32Connected && telemetry?.gps?.valid === true;

  const sensorHealth: SensorHealthStatus = {
    mpu: isMpuOk ? 'OPERATIONAL' : 'ERROR',
    pir: isPirOk ? 'OPERATIONAL' : 'DISABLED',
    gps: isGpsOk ? 'LOCKED' : isEsp32Connected ? 'SEARCHING' : 'UNAVAILABLE',
    buzzer: isEsp32Connected ? 'OPERATIONAL' : 'ERROR',
    overallScore: isEsp32Connected ? 100 : 0,
  };

  const securityScore = isArmed ? (isEsp32Connected ? 100 : 45) : 30;

  return (
    <DeviceContext.Provider
      value={{
        deviceId,
        setDeviceId,
        deviceName,
        setDeviceName,
        isTestMode,
        setTestMode,
        device,
        assets,
        activeAsset,
        settings,
        telemetry,
        alerts,
        events,
        activeAlert,
        setActiveAlert,
        routeHistory,
        currentSecurityMode,
        securityScore,
        sensorHealth,
        isAreaActive,
        isBelongingActive,
        isArmed,
        isSocketConnected,
        isEsp32Connected,
        lastHeartbeatAgeSec,
        serverLatencyMs,
        latestCommandStatus,
        commandHistory,
        pairDeviceAsset,
        armAsset,
        disarmAsset,
        armProtection,
        disarmProtection,
        stopSiren,
        setSecurityMode,
        turnOnAreaSecurity,
        turnOffAreaSecurity,
        turnOnBelongingSecurity,
        turnOffBelongingSecurity,
        updateCustomNames,
        armSystem,
        disarmSystem,
        activateBuzzer,
        stopBuzzer,
        toggleSilentMode,
        requestGPSUpdate,
        setSensitivityPreset,
        setMovementThreshold,
        setAlarmDuration,
        updateSettings,
        acknowledgeAlert,
        resolveAlert,
        clearAlerts,
        clearEvents,
        triggerTestAlert,
        refreshData,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
