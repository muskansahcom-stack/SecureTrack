import React from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const TestModeBanner: React.FC = () => {
  const { isTestMode, setTestMode } = useDevice();

  if (!isTestMode) return null;

  return (
    <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 py-2 text-amber-200 select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-xs font-semibold">
            <span className="font-extrabold text-amber-300">TEST / SIMULATION MODE</span>: ESP32 hardware is simulated.
          </p>
        </div>
        <button
          onClick={() => setTestMode(false)}
          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-[10px] font-bold text-amber-100 transition flex-shrink-0"
        >
          <Power className="w-3 h-3" />
          <span>EXIT</span>
        </button>
      </div>
    </div>
  );
};
