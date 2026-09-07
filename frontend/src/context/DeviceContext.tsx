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
// ULTIMATE WAKE-UP EMERGENCY KLAXON & AIR-RAID ALARM ENGINE
// Psychoacoustic Sleep-Disruption Synthesis
// ============================================================================
class UltraLoudAlarmEngine {
  private ctx: AudioContext | null = null;
  private isSirenRunning: boolean = false;

  private osc520Hz: OscillatorNode | null = null;
  private oscKlaxon: OscillatorNode | null = null;
  private oscPiercing: OscillatorNode | null = null;
  private oscSubBass: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;

  private lfoFast: OscillatorNode | null = null;
  private lfoFastGain: GainNode | null = null;
  private lfoStutter: OscillatorNode | null = null;
  private lfoStutterGain: GainNode | null = null;

  private masterGain: GainNode | null = null;
  private peakFilter1: BiquadFilterNode | null = null;
  private peakFilter2: BiquadFilterNode | null = null;
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

  private makeHyperDriveCurve(amount: number = 35) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 25 * deg) / (Math.PI + k * Math.abs(x));
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

  public startLoudSiren() {
    this.initContext();
    if (!this.ctx || this.isSirenRunning) return;

    try {
      this.isSirenRunning = true;
      const now = this.ctx.currentTime;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-28, now);
      this.compressor.knee.setValueAtTime(4, now);
      this.compressor.ratio.setValueAtTime(20, now);
      this.compressor.attack.setValueAtTime(0.001, now);
      this.compressor.release.setValueAtTime(0.05, now);
      this.compressor.connect(this.ctx.destination);

      this.peakFilter1 = this.ctx.createBiquadFilter();
      this.peakFilter1.type = 'peaking';
      this.peakFilter1.frequency.setValueAtTime(3200, now);
      this.peakFilter1.Q.setValueAtTime(2.0, now);
      this.peakFilter1.gain.setValueAtTime(16.0, now);
      this.peakFilter1.connect(this.compressor);

      this.peakFilter2 = this.ctx.createBiquadFilter();
      this.peakFilter2.type = 'peaking';
      this.peakFilter2.frequency.setValueAtTime(520, now);
      this.peakFilter2.Q.setValueAtTime(2.5, now);
      this.peakFilter2.gain.setValueAtTime(10.0, now);
      this.peakFilter2.connect(this.peakFilter1);

      this.waveShaper = this.ctx.createWaveShaper();
      this.waveShaper.curve = this.makeHyperDriveCurve(30);
      this.waveShaper.oversample = '4x';
      this.waveShaper.connect(this.peakFilter2);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(4.5, now);
      this.masterGain.connect(this.waveShaper);

      this.osc520Hz = this.ctx.createOscillator();
      this.osc520Hz.type = 'square';
      this.osc520Hz.frequency.setValueAtTime(520, now);

      this.oscKlaxon = this.ctx.createOscillator();
      this.oscKlaxon.type = 'sawtooth';
      this.oscKlaxon.frequency.setValueAtTime(1800, now);

      this.oscPiercing = this.ctx.createOscillator();
      this.oscPiercing.type = 'sawtooth';
      this.oscPiercing.frequency.setValueAtTime(3800, now);

      this.oscHarmonic = this.ctx.createOscillator();
      this.oscHarmonic.type = 'square';
      this.oscHarmonic.frequency.setValueAtTime(2200, now);

      this.oscSubBass = this.ctx.createOscillator();
      this.oscSubBass.type = 'triangle';
      this.oscSubBass.frequency.setValueAtTime(260, now);

      this.lfoFast = this.ctx.createOscillator();
      this.lfoFast.type = 'sawtooth';
      this.lfoFast.frequency.setValueAtTime(5.5, now);

      this.lfoFastGain = this.ctx.createGain();
      this.lfoFastGain.gain.setValueAtTime(1000, now);

      this.lfoFast.connect(this.lfoFastGain);
      this.lfoFastGain.connect(this.oscKlaxon.frequency);
      this.lfoFastGain.connect(this.oscHarmonic.frequency);
      this.lfoFastGain.connect(this.oscPiercing.frequency);

      this.lfoStutter = this.ctx.createOscillator();
      this.lfoStutter.type = 'square';
      this.lfoStutter.frequency.setValueAtTime(6.0, now);

      this.lfoStutterGain = this.ctx.createGain();
      this.lfoStutterGain.gain.setValueAtTime(180, now);
      this.lfoStutter.connect(this.lfoStutterGain);
      this.lfoStutterGain.connect(this.osc520Hz.frequency);

      this.osc520Hz.connect(this.masterGain);
      this.oscKlaxon.connect(this.masterGain);
      this.oscPiercing.connect(this.masterGain);
      this.oscHarmonic.connect(this.masterGain);
      this.oscSubBass.connect(this.masterGain);

      this.osc520Hz.start(now);
      this.oscKlaxon.start(now);
      this.oscPiercing.start(now);
      this.oscHarmonic.start(now);
      this.oscSubBass.start(now);
      this.lfoFast.start(now);
      this.lfoStutter.start(now);
    } catch (e) {
      console.warn('[Audio] Error starting wake-up siren:', e);
    }
  }

  public stopLoudSiren() {
    if (!this.isSirenRunning || !this.ctx) return;
    try {
      this.isSirenRunning = false;
      const now = this.ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.03);
      }
      setTimeout(() => {
        try {
          if (this.osc520Hz) { this.osc520Hz.stop(); this.osc520Hz.disconnect(); this.osc520Hz = null; }
          if (this.oscKlaxon) { this.oscKlaxon.stop(); this.oscKlaxon.disconnect(); this.oscKlaxon = null; }
          if (this.oscPiercing) { this.oscPiercing.stop(); this.oscPiercing.disconnect(); this.oscPiercing = null; }
          if (this.oscHarmonic) { this.oscHarmonic.stop(); this.oscHarmonic.disconnect(); this.oscHarmonic = null; }
          if (this.oscSubBass) { this.oscSubBass.stop(); this.oscSubBass.disconnect(); this.oscSubBass = null; }
          if (this.lfoFast) { this.lfoFast.stop(); this.lfoFast.disconnect(); this.lfoFast = null; }
          if (this.lfoFastGain) { this.lfoFastGain.disconnect(); this.lfoFastGain = null; }
          if (this.lfoStutter) { this.lfoStutter.stop(); this.lfoStutter.disconnect(); this.lfoStutter = null; }
          if (this.lfoStutterGain) { this.lfoStutterGain.disconnect(); this.lfoStutterGain = null; }
          if (this.masterGain) { this.masterGain.disconnect(); this.masterGain = null; }
          if (this.waveShaper) { this.waveShaper.disconnect(); this.waveShaper = null; }
          if (this.peakFilter1) { this.peakFilter1.disconnect(); this.peakFilter1 = null; }
          if (this.peakFilter2) { this.peakFilter2.disconnect(); this.peakFilter2 = null; }
          if (this.compressor) { this.compressor.disconnect(); this.compressor = null; }
        } catch (_) {}
      }, 40);
    } catch (e) {
      this.isSirenRunning = false;
    }
  }

  public playTone(type: 'CRITICAL' | 'HIGH' | 'CHIRP') {
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
      filter.frequency.setValueAtTime(3200, now);
      filter.gain.setValueAtTime(14.0, now);
      filter.connect(comp);

      osc.connect(gain);
      gain.connect(filter);

      if (type === 'CRITICAL') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(3600, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.35);
        gain.gain.setValueAtTime(3.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'HIGH') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(3.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.08);
        gain.gain.setValueAtTime(1.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }
}

export const alarmAudio = new UltraLoudAlarmEngine();

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
    let autoSiren = 1;

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
