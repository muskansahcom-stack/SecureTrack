import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Satellite,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Route,
  Activity,
  Compass,
  ShieldAlert
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';

export const LiveLocationScreen: React.FC = () => {
  const { telemetry, device, routeHistory, settings } = useDevice();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [copied, setCopied] = React.useState(false);

  const gps = telemetry?.gps;
  const hasValidFix = Boolean(gps?.valid && gps?.latitude && gps?.longitude);
  const isSilent = settings?.silent_mode === 1;
  const isMoving = (gps?.speed ?? 0) > 1.5 || telemetry?.mpu?.motion_detected;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = (hasValidFix && gps?.latitude) || (routeHistory.length > 0 && routeHistory[routeHistory.length - 1].latitude) || 28.613939;
      const initialLng = (hasValidFix && gps?.longitude) || (routeHistory.length > 0 && routeHistory[routeHistory.length - 1].longitude) || 77.209021;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([initialLat, initialLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom pulsing security pin icon
      const customIcon = L.divIcon({
        className: 'custom-gps-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px;">
            <div style="position: absolute; inset: -10px; background: rgba(59, 130, 246, 0.45); border-radius: 9999px; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; background: #2563eb; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center;">
              <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 9999px;"></div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      markerRef.current = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(map);
      circleRef.current = L.circle([initialLat, initialLng], {
        radius: 25,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      // Initialize route polyline
      const latLngs = routeHistory.map(p => [p.latitude, p.longitude] as [number, number]);
      polylineRef.current = L.polyline(latLngs, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update Marker & Breadcrumb Polyline when GPS changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (hasValidFix && gps?.latitude && gps?.longitude) {
      const latLng: [number, number] = [gps.latitude, gps.longitude];
      markerRef.current?.setLatLng(latLng);
      circleRef.current?.setLatLng(latLng);
      mapInstanceRef.current.panTo(latLng, { animate: true });
    }

    if (polylineRef.current && routeHistory.length > 0) {
      const latLngs = routeHistory.map(p => [p.latitude, p.longitude] as [number, number]);
      polylineRef.current.setLatLngs(latLngs);
    }
  }, [hasValidFix, gps?.latitude, gps?.longitude, routeHistory]);

  const copyCoordinates = () => {
    if (gps?.latitude && gps?.longitude) {
      navigator.clipboard.writeText(`${gps.latitude}, ${gps.longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const centerMap = () => {
    if (hasValidFix && gps?.latitude && gps?.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.setView([gps.latitude, gps.longitude], 16);
    }
  };

  const fitRouteBounds = () => {
    if (mapInstanceRef.current && routeHistory.length > 1) {
      const latLngs = routeHistory.map(p => [p.latitude, p.longitude] as [number, number]);
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const openGoogleMapsDirections = () => {
    if (gps?.latitude && gps?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${gps.latitude},${gps.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Live Bag GPS Tracking</h2>
          <p className="text-xs text-gray-400">Real-Time Satellite Breadcrumb Stream</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
            <Satellite className="w-3.5 h-3.5" />
            <span>{gps?.satellites || 0} Sats</span>
          </div>
          {isSilent && (
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold font-mono">
              🔕 Covert
            </span>
          )}
        </div>
      </div>

      {/* GPS Fix Status Banner */}
      {!hasValidFix && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center space-x-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-extrabold uppercase tracking-wide">GPS SIGNAL SEARCHING...</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              Acquiring satellite lock. Position will lock automatically once clear of dense blockage.
            </p>
          </div>
        </div>
      )}

      {/* Map Card */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-950 h-84">
        <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[340px]" />

        {/* Map Float Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col space-y-2">
          <button
            onClick={centerMap}
            className="p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-blue-400 border border-gray-700 shadow-lg backdrop-blur-md transition"
            title="Recenter on Bag"
          >
            <Navigation className="w-4 h-4" />
          </button>
          {routeHistory.length > 1 && (
            <button
              onClick={fitRouteBounds}
              className="p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-indigo-400 border border-gray-700 shadow-lg backdrop-blur-md transition"
              title="View Complete Theft Route"
            >
              <Route className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Breadcrumb Indicator Badge */}
        {routeHistory.length > 1 && (
          <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 text-[11px] font-mono font-bold shadow-lg backdrop-blur-md flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Trail: {routeHistory.length} Waypoints</span>
          </div>
        )}

        {/* Float Status Indicator */}
        <div className="absolute bottom-3 left-3 right-3 z-10 p-3 rounded-2xl bg-gray-900/95 border border-gray-800/90 backdrop-blur-md shadow-2xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${hasValidFix ? (isMoving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse') : 'bg-rose-500'}`}></div>
            <div>
              <p className="font-bold text-white">
                {hasValidFix
                  ? `${gps?.latitude?.toFixed(5)}, ${gps?.longitude?.toFixed(5)}`
                  : 'Searching Satellites...'}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {isMoving ? '⚠️ Bag in Motion' : 'Stationary'} • {device?.last_seen ? `Sync: ${new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Awaiting data'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {hasValidFix && (
              <>
                <button
                  onClick={copyCoordinates}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
                  title="Copy GPS coordinates"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={openGoogleMapsDirections}
                  className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-blue-500/20 transition"
                  title="Navigate in Google Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation Details Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-400 block">SATELLITES</span>
          <span className="text-base font-mono font-bold text-blue-400 mt-1 block">
            {gps?.satellites ?? 0} Locked
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-400 block">SPEED</span>
          <span className={`text-base font-mono font-bold mt-1 block ${isMoving ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
            {gps?.speed ? `${gps.speed.toFixed(1)} km/h` : '0.0 km/h'}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-400 block">ALTITUDE</span>
          <span className="text-base font-mono font-bold text-indigo-400 mt-1 block">
            {gps?.altitude ? `${gps.altitude.toFixed(0)}m` : '---'}
          </span>
        </div>
      </div>

      {/* One-Tap Navigate Hero Button */}
      {hasValidFix && (
        <button
          onClick={openGoogleMapsDirections}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 active:scale-98 transition"
        >
          <Navigation className="w-4 h-4 text-blue-200" />
          <span>Track & Navigate to Bag in Google Maps</span>
          <ExternalLink className="w-4 h-4 text-blue-200" />
        </button>
      )}
    </div>
  );
};
