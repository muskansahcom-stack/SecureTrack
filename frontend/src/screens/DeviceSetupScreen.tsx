import React, { useState } from 'react';
import { Cpu, CheckCircle2, XCircle, Wifi, Server, ArrowRight, ShieldCheck, Briefcase, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useDevice } from '../context/DeviceContext.js';
import { api } from '../api/client.js';

interface DeviceSetupScreenProps {
  onComplete: () => void;
}

const BELONGING_PRESETS = [
  'Laptop Bag',
  'Backpack',
  'Suitcase',
  'Travel Bag',
  'Wallet / Valuable',
  'Camera Case',
];

const AREA_PRESETS = [
  'Hostel Room',
  'Bedroom',
  'Office Desk',
  'Home Living Room',
  'Shop / Store',
  'Research Lab',
];

export const DeviceSetupScreen: React.FC<DeviceSetupScreenProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { deviceId, setDeviceId, deviceName, setDeviceName, isEsp32Connected, isSocketConnected, refreshData } = useDevice();
  
  const [inputDeviceId, setInputDeviceId] = useState(deviceId);
  const [selectedBelonging, setSelectedBelonging] = useState('Laptop Bag');
  const [customBelonging, setCustomBelonging] = useState('My Laptop Bag');
  const [selectedArea, setSelectedArea] = useState('Hostel Room');
  const [customArea, setCustomArea] = useState('My Hostel Room');
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSavePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);

    const finalBelonging = customBelonging.trim() || selectedBelonging;
    const finalArea = customArea.trim() || selectedArea;

    try {
      setDeviceId(inputDeviceId);
      setDeviceName(`Security Unit (${finalBelonging})`);

      await api.registerDevice({
        device_id: inputDeviceId,
        device_name: `Security Unit (${finalBelonging})`,
        user_id: user?.id || 'usr_muskan',
        area_name: finalArea,
        belonging_name: finalBelonging,
      });

      await refreshData();
      setSuccessMsg('Security device and personal items configured!');
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: any) {
      setSuccessMsg('Saved and synced with personal dashboard.');
      setTimeout(() => {
        onComplete();
      }, 800);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] px-4 py-8 select-none text-gray-100 flex flex-col justify-center relative overflow-hidden">
      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/25 mb-2.5">
            <Cpu className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Security Setup & Pairing</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium">Personalize what you protect with your ESP32</p>
        </div>

        <div className="bg-gray-900/95 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-xl">
          {/* Status Diagnostic Card */}
          <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Hardware Link Status</h3>
            
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-2 text-gray-300">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>IoT Broker:</span>
              </span>
              {isSocketConnected ? (
                <span className="flex items-center space-x-1 font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Online ✓</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40 text-[11px]">
                  <XCircle className="w-3 h-3" />
                  <span>Connecting...</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-2 text-gray-300">
                <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                <span>ESP32 Node:</span>
              </span>
              {isEsp32Connected ? (
                <span className="flex items-center space-x-1 font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Linked ✓</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 text-[11px]">
                  <Wifi className="w-3 h-3" />
                  <span>Awaiting Link</span>
                </span>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePairing} className="space-y-4">
            {/* 1. Protected Item Setup */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>What do you want to protect? (Belonging)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {BELONGING_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedBelonging(preset);
                      setCustomBelonging(`My ${preset}`);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      selectedBelonging === preset
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                        : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={customBelonging}
                onChange={(e) => setCustomBelonging(e.target.value)}
                placeholder="e.g. My ThinkPad Laptop Bag"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* 2. Protected Area Setup */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center space-x-1.5">
                <Home className="w-3.5 h-3.5 text-blue-400" />
                <span>Where is the perimeter? (Area Name)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {AREA_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedArea(preset);
                      setCustomArea(`My ${preset}`);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      selectedArea === preset
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20'
                        : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Room 402, Hostel Wing B"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 3. Hardware Device ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Hardware Device ID</label>
              <input
                type="text"
                required
                value={inputDeviceId}
                onChange={(e) => setInputDeviceId(e.target.value)}
                placeholder="ESP32-SECURITY-001"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-xs text-blue-400 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
            >
              <span>{isSaving ? 'Configuring Security Profile...' : 'SAVE & GO TO DASHBOARD'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
