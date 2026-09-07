import React from 'react';
import { Shield, Wifi, WifiOff, Cpu, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';
import { AppTab } from '../types/index.js';

interface NavbarProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setCurrentTab }) => {
  const { deviceId, device, isEsp32Connected, isTestMode, refreshData } = useDevice();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const isArmed = device?.is_armed === 1;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070a12]/95 backdrop-blur-md border-b border-gray-800/80 px-4 py-2.5 select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Logo */}
        <div 
          className="flex items-center space-x-2.5 cursor-pointer"
          onClick={() => setCurrentTab('dashboard')}
        >
          <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-blue-500/40 shadow-md shadow-blue-500/20 flex-shrink-0 bg-gray-950">
            <img 
              src="/logo.png" 
              alt="SecureBelong Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-wider text-white">SECURE<span className="text-blue-400">BELONG</span></h1>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono font-bold border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium leading-none">IoT Security Gateway</p>
          </div>
        </div>

        {/* Status Indicators & Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Real Hardware vs Simulation Mode Pill */}
          {isTestMode ? (
            <button
              onClick={() => setCurrentTab('settings')}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
              title="Test / Simulation Mode Active"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>TEST MODE</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>HARDWARE</span>
            </div>
          )}

          {/* ESP32 Hardware Status Badge */}
          <button
            onClick={() => setCurrentTab('health')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              isEsp32Connected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/50 animate-pulse'
            }`}
            title={`Device: ${deviceId}`}
          >
            {isEsp32Connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-bold">OFFLINE</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            title="Refresh State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
