import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Device,
  DeviceSettings,
  Telemetry,
  Alert,
  EventLog,
  GPSPoint,
  SecurityModeType,
  CommandAuditItem,
  SensorHealthStatus,
} from '../types/index.js';
import { api, API_BASE_URL } from '../api/client.js';

interface DeviceContextType {
  deviceId: string;
  setDeviceId: (id: string) => void;
  deviceName: string;
  setDeviceName: (name: string) => void;
  isTestMode: boolean;
  setTestMode: (enabled: boolean) => void;

  // Real-time telemetry & entity state
  device: Device | null;
  settings: DeviceSettings | null;
  telemetry: Telemetry | null;
  alerts: Alert[];
  events: EventLog[];
  activeAlert: Alert | null;
  setActiveAlert: (a: Alert | null) => void;
  routeHistory: GPSPoint[];

  // Security mode & status
  currentSecurityMode: SecurityModeType;
  securityScore: number;
  sensorHealth: SensorHealthStatus;
  isAreaActive: boolean;
  isBelongingActive: boolean;

  // Connection & Diagnostics
  isSocketConnected: boolean;
  isEsp32Connected: boolean;
  lastHeartbeatAgeSec: number;
  serverLatencyMs: number;
  latestCommandStatus: CommandAuditItem | null;
  commandHistory: CommandAuditItem[];

  // Security Mode Presets
  setSecurityMode: (mode: SecurityModeType) => Promise<void>;

  // Independent Security Controls
  turnOnAreaSecurity: () => Promise<void>;
  turnOffAreaSecurity: () => Promise<void>;
  turnOnBelongingSecurity: () => Promise<void>;
  turnOffBelongingSecurity: () => Promise<void>;
  updateCustomNames: (areaName: string, belongingName: string) => Promise<void>;

  // Hardware Deterrent & Alarm Controls
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
// Modeled after authentic Federal Signal / Whelen electronic emergency vehicle sirens:
// 1. Authentic Police Wail: 550 Hz - 1600 Hz smooth undulating continuous sweep (0.26 Hz)
// 2. Tactical Police Yelp: 650 Hz - 1650 Hz rapid cycling emergency pursuit (3.6 Hz)
// 3. Ultra Piercer / Phaser: 750 Hz - 1800 Hz high-frequency warning (9.5 Hz)
// 4. European / Tactical Hi-Lo: Dual-tone alternating horn (680 Hz / 940 Hz)
// 5. Dual Cruiser Siren: Wail + Harmonized Horn resonance + Yelp subharmonic
// ============================================================================
export type PoliceSirenMode = 'CRUISER' | 'WAIL' | 'YELP' | 'PIERCER' | 'HILO';

class PoliceEmergencySirenEngine {
  private ctx: AudioContext | null = null;
  private isSirenRunning: boolean = false;
  private currentMode: PoliceSirenMode = 'CRUISER';
  private currentVolume: number = 0.85;

  // Primary & Harmonic Oscillators
  private oscPrimary: OscillatorNode | null = null;
  private oscSecondary: OscillatorNode | null = null;
  private oscSubHorn: OscillatorNode | null = null;
  private oscTweeter: OscillatorNode | null = null;

  // Siren Modulation LFOs
  private lfoPrimary: OscillatorNode | null = null;
  private lfoPrimaryGain: GainNode | null = null;
  private lfoSecondaryGain: GainNode | null = null;

  private lfoFast: OscillatorNode | null = null;
  private lfoFastGain: GainNode | null = null;

  // Signal Processing & Formant Modeling
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

  // Generate realistic emergency speaker horn saturation curve
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

  // Start continuous authentic Police Siren
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

      // 1. Dynamics Compressor (Prevents speaker clipping while maximizing acoustic punch)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, now);
      this.compressor.knee.setValueAtTime(4, now);
      this.compressor.ratio.setValueAtTime(14, now);
      this.compressor.attack.setValueAtTime(0.002, now);
      this.compressor.release.setValueAtTime(0.05, now);
      this.compressor.connect(this.ctx.destination);

      // 2. Siren Horn Resonance Formant Filters (100W Speaker Bell Flare Simulation)
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

      // 3. Siren Horn Overdrive WaveShaper (Adds authentic emergency vehicle acoustic bite)
      this.waveShaper = this.ctx.createWaveShaper();
      this.waveShaper.curve = this.makeHornCurve(16);
      this.waveShaper.oversample = '4x';
      this.waveShaper.connect(this.hornFilter3);

      // 4. Master Volume Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.01, now);
      this.masterGain.gain.linearRampToValueAtTime(this.currentVolume * 2.8, now + 0.08);
      this.masterGain.connect(this.waveShaper);

      // Configure based on selected siren mode
      if (mode === 'WAIL' || mode === 'CRUISER') {
        // --- POLICE WAIL MODE ---
        // Primary Sawtooth Carrier (Center: 1050 Hz)
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'sawtooth';
        this.oscPrimary.frequency.setValueAtTime(1050, now);

        // Secondary Square Carrier with slight detune for authentic chorused acoustic body
        this.oscSecondary = this.ctx.createOscillator();
        this.oscSecondary.type = 'square';
        this.oscSecondary.frequency.setValueAtTime(1058, now);

        // Sub-Horn Resonator (260 Hz)
        this.oscSubHorn = this.ctx.createOscillator();
        this.oscSubHorn.type = 'triangle';
        this.oscSubHorn.frequency.setValueAtTime(260, now);

        // Piercing Overtone (3150 Hz)
        this.oscTweeter = this.ctx.createOscillator();
        this.oscTweeter.type = 'sawtooth';
        this.oscTweeter.frequency.setValueAtTime(3150, now);

        // Main Wail LFO: Smooth 0.25 Hz undulating rise & fall (550 Hz - 1550 Hz)
        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'triangle';
        this.lfoPrimary.frequency.setValueAtTime(0.25, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(500, now); // Sweeps 550 Hz to 1550 Hz
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);

        this.lfoSecondaryGain = this.ctx.createGain();
        this.lfoSecondaryGain.gain.setValueAtTime(510, now);
        this.lfoPrimary.connect(this.lfoSecondaryGain);
        this.lfoSecondaryGain.connect(this.oscSecondary.frequency);
        this.lfoSecondaryGain.connect(this.oscTweeter.frequency);

        if (mode === 'CRUISER') {
          // Add layered tactical fast pulse undertone
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
        // --- POLICE YELP MODE (Rapid tactical sweep 3.6 Hz) ---
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'sawtooth';
        this.oscPrimary.frequency.setValueAtTime(1150, now);

        this.oscSecondary = this.ctx.createOscillator();
        this.oscSecondary.type = 'square';
        this.oscSecondary.frequency.setValueAtTime(1160, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'sawtooth';
        this.lfoPrimary.frequency.setValueAtTime(3.6, now); // ~216 cycles/min

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(500, now); // 650 Hz to 1650 Hz
        this.lfoPrimary.connect(this.lfoPrimaryGain);
        this.lfoPrimaryGain.connect(this.oscPrimary.frequency);
        this.lfoPrimaryGain.connect(this.oscSecondary.frequency);

        this.oscPrimary.connect(this.masterGain);
        this.oscSecondary.connect(this.masterGain);

        this.oscPrimary.start(now);
        this.oscSecondary.start(now);
        this.lfoPrimary.start(now);

      } else if (mode === 'PIERCER') {
        // --- POLICE PIERCER / PHASER (High frequency 9.5 Hz) ---
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
        // --- POLICE HI-LO (European / Tactical Two-Tone 1.6 Hz) ---
        this.oscPrimary = this.ctx.createOscillator();
        this.oscPrimary.type = 'square';
        this.oscPrimary.frequency.setValueAtTime(800, now);

        this.lfoPrimary = this.ctx.createOscillator();
        this.lfoPrimary.type = 'square';
        this.lfoPrimary.frequency.setValueAtTime(1.6, now);

        this.lfoPrimaryGain = this.ctx.createGain();
        this.lfoPrimaryGain.gain.setValueAtTime(140, now); // Toggles 660 Hz & 940 Hz
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

  // Stop siren immediately with smooth pop-free decay
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

  // Play crisp police alert tones (One-shot)
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
        // High-volume police 2-tone sweep burst
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(1750, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.50);
        gain.gain.setValueAtTime(this.currentVolume * 3.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
      } else if (type === 'HORN') {
        // Heavy emergency vehicle air horn blast
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(this.currentVolume * 3.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'HIGH') {
        // Rapid tactical police yelp chirp
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(1650, now + 0.16);
        gain.gain.setValueAtTime(this.currentVolume * 2.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.30);
        osc.start(now);
        osc.stop(now + 0.30);
      } else {
        // Clean high-tech confirmation chirp
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
  const [isTestMode, setIsTestModeState] = useState<boolean>(
    localStorage.getItem('securebelong_test_mode') === 'true'
  );

  const [device, setDevice] = useState<Device | null>(null);
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
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const lastMpuTimeRef = useRef<number>(Date.now());
  const lastPirTimeRef = useRef<number>(Date.now());
  const lastGpsTimeRef = useRef<number>(Date.now());

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
    localStorage.setItem('securebelong_test_mode', enabled ? 'true' : 'false');
  };

  // Helper to record & update command status audit trail
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
      const [statusRes, alertsRes, eventsRes, settingsRes, routeRes] = await Promise.allSettled([
        api.getDeviceStatus(deviceId),
        api.getAlerts(deviceId),
        api.getEvents(deviceId),
        api.getDeviceSettings(deviceId),
        api.getGPSRoute(deviceId, 100),
      ]);

      setServerLatencyMs(Date.now() - startTime);

      if (statusRes.status === 'fulfilled' && statusRes.value.data) {
        setDevice(statusRes.value.data.device);
        if (statusRes.value.data.latestTelemetry && !isTestMode) {
          setTelemetry(statusRes.value.data.latestTelemetry);
        }
        if (statusRes.value.data.device?.last_seen) {
          lastHeartbeatTimeRef.current = new Date(statusRes.value.data.device.last_seen).getTime();
        }
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        setSettings(settingsRes.value.data);
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.data) {
        setAlerts(alertsRes.value.data);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        setEvents(eventsRes.value.data);
      }

      if (routeRes.status === 'fulfilled' && Array.isArray(routeRes.value.data)) {
        setRouteHistory(routeRes.value.data);
      }
    } catch (err) {
      console.warn('Error fetching device data:', err);
    }
  }, [deviceId, isTestMode]);

  // WebSocket Connection
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

    socket.on('device:telemetry', (data: Telemetry) => {
      if (data.device_id === deviceId && !isTestMode) {
        setTelemetry(data);
        lastHeartbeatTimeRef.current = Date.now();
        lastMpuTimeRef.current = Date.now();
        lastPirTimeRef.current = Date.now();
        if (data.gps?.valid) {
          lastGpsTimeRef.current = Date.now();
        }
        setDevice((prev) => (prev ? { ...prev, is_online: 1, last_seen: data.timestamp } : prev));

        if (data.buzzer_active && settings?.silent_mode !== 1) {
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
        }
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
  }, [deviceId, isTestMode, refreshData]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Heartbeat age counter
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - lastHeartbeatTimeRef.current) / 1000));
      setLastHeartbeatAgeSec(elapsedSec);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // TEST / SIMULATION MODE GENERATOR
  useEffect(() => {
    if (!isTestMode) return;

    console.log('[Simulation] Test mode active. Generating simulated sensor stream.');
    const simInterval = setInterval(() => {
      const isArmed = device?.is_armed === 1;
      const baseAccel = 1.0;
      const noise = (Math.random() - 0.5) * 0.04;
      const simMagnitude = Math.abs(noise);

      setTelemetry({
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        mpu: {
          accel_x: parseFloat(((Math.random() - 0.5) * 0.08).toFixed(3)),
          accel_y: parseFloat(((Math.random() - 0.5) * 0.08).toFixed(3)),
          accel_z: parseFloat((baseAccel + noise).toFixed(3)),
          gyro_x: parseFloat(((Math.random() - 0.5) * 2.0).toFixed(2)),
          gyro_y: parseFloat(((Math.random() - 0.5) * 2.0).toFixed(2)),
          gyro_z: parseFloat(((Math.random() - 0.5) * 2.0).toFixed(2)),
          magnitude: parseFloat(simMagnitude.toFixed(3)),
          motion_detected: simMagnitude > 0.3,
          intensity: simMagnitude > 0.6 ? 'HIGH' : simMagnitude > 0.3 ? 'MEDIUM' : 'LOW',
          movement_status: simMagnitude > 0.6 ? 'HIGH MOVEMENT' : simMagnitude > 0.3 ? 'MOVEMENT' : 'NORMAL',
        },
        pir: {
          motion: false,
          raw_val: 0,
          detection_count: 3,
          last_detected: new Date(Date.now() - 300000).toISOString(),
        },
        gps: {
          latitude: 28.613939,
          longitude: 77.209021,
          valid: true,
          satellites: 9,
          altitude: 216.5,
          speed: 0.0,
          last_update: new Date().toISOString(),
        },
        buzzer_active: false,
        system_armed: isArmed,
        free_heap: 182400,
        uptime_sec: 3600,
        wifi_rssi: -54,
      });

      setDevice((prev) =>
        prev
          ? { ...prev, is_online: 1, last_seen: new Date().toISOString() }
          : {
              id: 'sim_dev',
              device_id: deviceId,
              device_name: 'Simulated ESP32 Test Rig',
              user_id: 'usr_test',
              is_online: 1,
              is_armed: isArmed ? 1 : 0,
              last_seen: new Date().toISOString(),
              firmware_version: 'v1.0.0-TEST',
              wifi_rssi: -54,
              created_at: new Date().toISOString(),
            }
      );
      lastHeartbeatTimeRef.current = Date.now();
    }, 1000);

    return () => clearInterval(simInterval);
  }, [isTestMode, deviceId, device?.is_armed]);

  // Independent Security Controls
  const turnOnAreaSecurity = async () => {
    trackCommand('ARM_AREA_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    if (isTestMode) {
      setSettings((prev) => (prev ? { ...prev, area_security_enabled: 1 } : null));
    }
    try {
      await api.armAreaSecurity(deviceId);
      trackCommand('ARM_AREA_SECURITY', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('ARM_AREA_SECURITY', 'FAILED', e.message);
    }
  };

  const turnOffAreaSecurity = async () => {
    trackCommand('DISARM_AREA_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    if (isTestMode) {
      setSettings((prev) => (prev ? { ...prev, area_security_enabled: 0 } : null));
    }
    try {
      await api.disarmAreaSecurity(deviceId);
      trackCommand('DISARM_AREA_SECURITY', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('DISARM_AREA_SECURITY', 'FAILED', e.message);
    }
  };

  const turnOnBelongingSecurity = async () => {
    trackCommand('ARM_PERSONAL_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    if (isTestMode) {
      setSettings((prev) => (prev ? { ...prev, belonging_security_enabled: 1 } : null));
    }
    try {
      await api.armPersonalSecurity(deviceId);
      trackCommand('ARM_PERSONAL_SECURITY', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('ARM_PERSONAL_SECURITY', 'FAILED', e.message);
    }
  };

  const turnOffBelongingSecurity = async () => {
    trackCommand('DISARM_PERSONAL_SECURITY', 'SENDING');
    alarmAudio.playTone('CHIRP');
    if (isTestMode) {
      setSettings((prev) => (prev ? { ...prev, belonging_security_enabled: 0 } : null));
    }
    try {
      await api.disarmPersonalSecurity(deviceId);
      trackCommand('DISARM_PERSONAL_SECURITY', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('DISARM_PERSONAL_SECURITY', 'FAILED', e.message);
    }
  };

  // 4 Security Modes Engine
  const setSecurityMode = async (mode: SecurityModeType) => {
    trackCommand(`SET_MODE_${mode}`, 'SENDING');
    alarmAudio.playTone('CHIRP');

    let areaOn = 0;
    let belongingOn = 0;

    switch (mode) {
      case 'HOME':
        areaOn = 1;
        belongingOn = 0;
        break;
      case 'AWAY':
        areaOn = 1;
        belongingOn = 1;
        break;
      case 'TRAVEL':
        areaOn = 0;
        belongingOn = 1;
        break;
      case 'EMERGENCY':
        areaOn = 1;
        belongingOn = 1;
        alarmAudio.startLoudSiren();
        break;
      default:
        break;
    }

    if (isTestMode) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              security_mode: mode,
              area_security_enabled: areaOn,
              belonging_security_enabled: belongingOn,
            }
          : null
      );
      setDevice((prev) => (prev ? { ...prev, is_armed: areaOn || belongingOn ? 1 : 0 } : null));
    }

    try {
      await api.setSecurityMode(deviceId, mode);
      await api.updateDeviceSettings(deviceId, {
        security_mode: mode,
        area_security_enabled: areaOn,
        belonging_security_enabled: belongingOn,
      });
      trackCommand(`SET_MODE_${mode}`, 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand(`SET_MODE_${mode}`, 'FAILED', e.message);
    }
  };

  const updateCustomNames = async (areaName: string, belongingName: string) => {
    const res = await api.updateDeviceSettings(deviceId, {
      area_name: areaName,
      belonging_name: belongingName,
    });
    setSettings(res.data);
  };

  const armSystem = async () => {
    trackCommand('ARM', 'SENDING');
    alarmAudio.playTone('CHIRP');
    if (isTestMode) {
      setDevice((prev) => (prev ? { ...prev, is_armed: 1 } : null));
      setSettings((prev) => (prev ? { ...prev, area_security_enabled: 1, belonging_security_enabled: 1 } : null));
    }
    try {
      await api.sendCommand(deviceId, 'ARM');
      trackCommand('ARM', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('ARM', 'FAILED', e.message);
    }
  };

  const disarmSystem = async () => {
    trackCommand('DISARM', 'SENDING');
    alarmAudio.playTone('CHIRP');
    alarmAudio.stopLoudSiren();
    if (isTestMode) {
      setDevice((prev) => (prev ? { ...prev, is_armed: 0 } : null));
      setSettings((prev) => (prev ? { ...prev, area_security_enabled: 0, belonging_security_enabled: 0 } : null));
    }
    try {
      await api.sendCommand(deviceId, 'DISARM');
      trackCommand('DISARM', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('DISARM', 'FAILED', e.message);
    }
  };

  const activateBuzzer = async () => {
    trackCommand('BUZZER_ON', 'SENDING');
    alarmAudio.startLoudSiren();
    try {
      await api.turnBuzzerOn(deviceId);
      trackCommand('BUZZER_ON', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('BUZZER_ON', 'FAILED', e.message);
    }
  };

  const stopBuzzer = async () => {
    trackCommand('BUZZER_OFF', 'SENDING');
    alarmAudio.stopLoudSiren();
    alarmAudio.playTone('CHIRP');
    try {
      await api.turnBuzzerOff(deviceId);
      setActiveAlert(null);
      trackCommand('BUZZER_OFF', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('BUZZER_OFF', 'FAILED', e.message);
    }
  };

  const toggleSilentMode = async () => {
    alarmAudio.playTone('CHIRP');
    const currentVal = settings?.silent_mode ?? 0;
    const newVal = currentVal === 1 ? 0 : 1;
    if (newVal === 1) {
      alarmAudio.stopLoudSiren();
    }
    trackCommand(`SET_SILENT_MODE_${newVal ? 'ON' : 'OFF'}`, 'SENDING');
    const res = await api.updateDeviceSettings(deviceId, { silent_mode: newVal });
    setSettings(res.data);
    trackCommand(`SET_SILENT_MODE_${newVal ? 'ON' : 'OFF'}`, 'SENT');
  };

  const requestGPSUpdate = async () => {
    trackCommand('REQUEST_GPS', 'SENDING');
    alarmAudio.playTone('CHIRP');
    try {
      await api.requestGPS(deviceId);
      trackCommand('REQUEST_GPS', 'SENT');
      await refreshData();
    } catch (e: any) {
      trackCommand('REQUEST_GPS', 'FAILED', e.message);
    }
  };

  const setSensitivityPreset = async (preset: 'LOW' | 'MEDIUM' | 'HIGH') => {
    let th = 0.30;
    if (preset === 'LOW') th = 0.55;
    if (preset === 'MEDIUM') th = 0.30;
    if (preset === 'HIGH') th = 0.15;
    await api.updateDeviceSettings(deviceId, { movement_threshold: th, sensitivity_preset: preset });
    setSettings((prev) => (prev ? { ...prev, movement_threshold: th, sensitivity_preset: preset } : null));
  };

  const setMovementThreshold = async (threshold: number) => {
    await api.updateDeviceSettings(deviceId, { movement_threshold: threshold });
    setSettings((prev) => (prev ? { ...prev, movement_threshold: threshold } : null));
  };

  const setAlarmDuration = async (durationSec: number) => {
    await api.updateDeviceSettings(deviceId, { alarm_duration_sec: durationSec });
    setSettings((prev) => (prev ? { ...prev, alarm_duration_sec: durationSec } : null));
  };

  const updateSettings = async (updates: Partial<DeviceSettings>) => {
    const res = await api.updateDeviceSettings(deviceId, updates);
    setSettings(res.data);
  };

  const acknowledgeAlert = async (alertId: string) => {
    alarmAudio.stopLoudSiren();
    await api.acknowledgeAlert(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: 1 } : a))
    );
    if (activeAlert?.id === alertId) {
      setActiveAlert(null);
    }
  };

  const resolveAlert = async (alertId: string) => {
    alarmAudio.stopLoudSiren();
    await api.resolveAlert(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: 1, resolved: 1 } : a))
    );
    if (activeAlert?.id === alertId) {
      setActiveAlert(null);
    }
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
    await api.triggerSimulationAlert({
      device_id: deviceId,
      alert_type: type,
      title: type === 'MOTION' ? '🚨 [TEST] Belonging Movement' : '🚨 [TEST] Area Intrusion',
      description:
        type === 'MOTION'
          ? 'Simulated personal belonging displacement detected via MPU6050.'
          : 'Simulated human perimeter intrusion detected via HC-SR501 PIR.',
      severity: type === 'MOTION' ? 'HIGH' : 'CRITICAL',
    });
    await refreshData();
  };

  const isEsp32Connected = isTestMode ? true : device?.is_online === 1 && lastHeartbeatAgeSec < 15;
  const isAreaActive = settings?.area_security_enabled === 1 || telemetry?.area_security_enabled === true;
  const isBelongingActive = settings?.belonging_security_enabled === 1 || telemetry?.belonging_security_enabled === true;

  // Determine current active security mode
  let currentSecurityMode: SecurityModeType = settings?.security_mode || 'CUSTOM';
  if (isAreaActive && isBelongingActive) {
    if (telemetry?.buzzer_active) {
      currentSecurityMode = 'EMERGENCY';
    } else {
      currentSecurityMode = 'AWAY';
    }
  } else if (isAreaActive && !isBelongingActive) {
    currentSecurityMode = 'HOME';
  } else if (!isAreaActive && isBelongingActive) {
    currentSecurityMode = 'TRAVEL';
  }

  // Sensor health status calculations & timeout detection
  const isMpuOk = isTestMode || (isEsp32Connected && (Date.now() - lastMpuTimeRef.current) < 20000);
  const isPirOk = settings?.pir_enabled !== 0;
  const isGpsOk = telemetry?.gps?.valid === true;

  // Security Score calculation
  let calculatedScore = 100;
  if (!isEsp32Connected && !isTestMode) calculatedScore -= 40;
  if (!isAreaActive && !isBelongingActive) calculatedScore -= 15;
  const unackedCritAlerts = alerts.filter((a) => a.acknowledged === 0 && (a.severity === 'CRITICAL' || a.severity === 'HIGH')).length;
  calculatedScore -= Math.min(30, unackedCritAlerts * 15);
  if (!isGpsOk) calculatedScore -= 5;
  if (calculatedScore < 0) calculatedScore = 0;

  const sensorHealth: SensorHealthStatus = {
    mpu: isMpuOk ? 'OPERATIONAL' : 'TIMEOUT',
    pir: isPirOk ? (isEsp32Connected ? 'OPERATIONAL' : 'TIMEOUT') : 'DISABLED',
    gps: isGpsOk ? 'LOCKED' : 'SEARCHING',
    buzzer: isEsp32Connected ? 'OPERATIONAL' : 'ERROR',
    overallScore: calculatedScore,
  };

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
        settings,
        telemetry,
        alerts,
        events,
        activeAlert,
        setActiveAlert,
        routeHistory,
        currentSecurityMode,
        securityScore: calculatedScore,
        sensorHealth,
        isAreaActive,
        isBelongingActive,
        isSocketConnected,
        isEsp32Connected,
        lastHeartbeatAgeSec,
        serverLatencyMs,
        latestCommandStatus,
        commandHistory,
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
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within a DeviceProvider');
  return ctx;
};
