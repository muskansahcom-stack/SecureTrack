import React from 'react';
import { AlertCircle, VolumeX, CheckCircle, MapPin, Navigation } from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

interface AlertBannerProps {
  onNavigateToLocation?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateToLocation }) => {
  const { activeAlert, acknowledgeAlert, stopSiren, stopBuzzer, deviceId, activeAsset, settings, telemetry } = useDevice();

  if (!activeAlert) return null;

  const isCritical = activeAlert.severity === 'CRITICAL';
  const assetName = activeAsset?.asset_name || settings?.belonging_name || 'My Laptop';
  const isSirenActive = telemetry?.buzzer_active === true;
  const hasGps = Boolean(activeAlert.latitude && activeAlert.longitude) || Boolean(telemetry?.gps?.valid);
  const lat = activeAlert.latitude ?? telemetry?.gps?.latitude;
  const lon = activeAlert.longitude ?? telemetry?.gps?.longitude;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 py-2 select-none">
      <div className="max-w-md mx-auto bg-gradient-to-r from-rose-950/98 via-red-900/98 to-rose-950/98 border-2 border-rose-500 rounded-2xl shadow-2xl p-4 text-white backdrop-blur-md animate-pulse">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-600 text-white animate-bounce border border-rose-400 shadow-lg shadow-rose-600/50 flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/50 text-rose-100 border border-rose-400">
                🚨 SECURITY ALERT
              </span>
              <span className="text-[10px] text-rose-200 font-mono">
                {new Date(activeAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <h3 className="text-sm font-black mt-1 text-white leading-tight">
              Unexpected movement detected
            </h3>

            {/* Structured Details Matrix */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 rounded-xl bg-black/40 border border-rose-500/30 text-[11px] font-mono">
              <div>
                <span className="text-rose-300/70 block text-[9px] uppercase">Asset:</span>
                <span className="font-bold text-white truncate block">{assetName}</span>
              </div>
              <div>
                <span className="text-rose-300/70 block text-[9px] uppercase">Device:</span>
                <span className="font-bold text-cyan-300 truncate block">{deviceId || 'ESP32-SECURITY-001'}</span>
              </div>
              <div>
                <span className="text-rose-300/70 block text-[9px] uppercase">Siren:</span>
                <span className={`font-bold ${isSirenActive ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {isSirenActive ? '🔴 ACTIVE' : 'READY'}
                </span>
              </div>
              <div>
                <span className="text-rose-300/70 block text-[9px] uppercase">GPS:</span>
                <span className="font-bold text-amber-300">
                  {hasGps ? 'Location Available' : 'Searching'}
                </span>
              </div>
            </div>

            {hasGps && typeof lat === 'number' && typeof lon === 'number' && (
              <div className="flex items-center space-x-1 text-[10px] text-rose-200/90 mt-1.5 font-mono">
                <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>GPS: {lat.toFixed(4)}, {lon.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3.5 pt-2.5 border-t border-rose-500/40 grid grid-cols-3 gap-2">
          {onNavigateToLocation && (
            <button
              onClick={onNavigateToLocation}
              className="flex items-center justify-center space-x-1 py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-[11px] shadow transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>VIEW LOCATION</span>
            </button>
          )}

          <button
            onClick={() => {
              stopSiren();
              stopBuzzer();
            }}
            className={`flex items-center justify-center space-x-1 py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-[11px] shadow transition ${
              onNavigateToLocation ? '' : 'col-span-1'
            }`}
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>STOP SIREN</span>
          </button>

          <button
            onClick={() => acknowledgeAlert(activeAlert.id)}
            className="flex items-center justify-center space-x-1 py-2 px-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-rose-400/50 text-rose-200 font-bold text-[11px] transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>ACKNOWLEDGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
