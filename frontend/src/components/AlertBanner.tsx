import React from 'react';
import { AlertCircle, VolumeX, CheckCircle, MapPin } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const AlertBanner: React.FC = () => {
  const { activeAlert, acknowledgeAlert, stopBuzzer, deviceId } = useDevice();

  if (!activeAlert) return null;

  const isCritical = activeAlert.severity === 'CRITICAL';

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 py-2 select-none animate-bounce">
      <div className="max-w-md mx-auto bg-gradient-to-r from-rose-950/95 to-red-900/95 border-2 border-rose-500 rounded-2xl shadow-2xl p-4 text-white backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-600/30 text-rose-300 animate-pulse border border-rose-500/50">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/40 text-rose-200 border border-rose-400/40">
                  {isCritical ? '🚨 INTRUSION' : '⚠️ MOTION DETECTED'}
                </span>
                <span className="text-[11px] text-rose-300 font-mono">
                  {new Date(activeAlert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-white">{activeAlert.title}</h3>
              <p className="text-xs text-rose-200 mt-0.5 leading-relaxed">{activeAlert.description}</p>
              
              {activeAlert.latitude && activeAlert.longitude && (
                <div className="flex items-center space-x-1 text-[10px] text-rose-300/80 mt-1 font-mono">
                  <MapPin className="w-3 h-3" />
                  <span>GPS: {activeAlert.latitude.toFixed(4)}, {activeAlert.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3.5 pt-2.5 border-t border-rose-500/30 grid grid-cols-2 gap-2">
          <button
            onClick={() => stopBuzzer()}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-lg transition"
          >
            <VolumeX className="w-4 h-4" />
            <span>STOP BUZZER</span>
          </button>
          <button
            onClick={() => acknowledgeAlert(activeAlert.id)}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-400/40 text-rose-200 font-bold text-xs transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ACKNOWLEDGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
