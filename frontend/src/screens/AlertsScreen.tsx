import React, { useState } from 'react';
import {
  Bell,
  History,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Filter,
  Shield,
  Activity,
  Radio,
  Compass,
  VolumeX,
  Volume2,
  MapPin,
  Check,
  AlertOctagon,
  Info
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext.js';
import { Alert, EventLog } from '../types/index.js';

export const AlertsScreen: React.FC = () => {
  const { alerts, events, acknowledgeAlert, resolveAlert, clearAlerts, clearEvents } = useDevice();
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'history'>('alerts');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'RESOLVED'>('ALL');
  const [filterSensor, setFilterSensor] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'RESOLVED') return a.resolved === 1 || a.acknowledged === 1;
    if (filterCategory === 'CRITICAL') return a.severity === 'CRITICAL' && !a.resolved;
    if (filterCategory === 'WARNING') return (a.severity === 'HIGH' || a.severity === 'MEDIUM') && !a.resolved;
    if (filterCategory === 'INFO') return a.severity === 'INFO' && !a.resolved;
    return true;
  });

  const filteredEvents = events.filter((e) => {
    if (filterSensor === 'ALL') return true;
    return e.sensor === filterSensor || e.event_type.includes(filterSensor);
  });

  const getSeverityBadge = (severity: string, isResolved?: boolean) => {
    if (isResolved) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'HIGH':
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getSensorIcon = (sensor: string) => {
    switch (sensor) {
      case 'MPU6050':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'PIR':
        return <Radio className="w-4 h-4 text-indigo-400" />;
      case 'GPS':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'BUZZER':
        return <Volume2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white">Security Alerts & Audit Log</h2>
          <p className="text-xs text-gray-400">Real-time incident response & hardware event log</p>
        </div>
      </div>

      {/* Sub-tabs: Active Alerts vs Audit History */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-900 border border-gray-800 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'alerts'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts ({alerts.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({events.length})</span>
        </button>
      </div>

      {/* 1. Alerts View */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO', 'RESOLVED'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Filtered Incidents ({filteredAlerts.length})
            </span>
            {alerts.length > 0 && (
              <button
                onClick={() => clearAlerts()}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Alerts</span>
              </button>
            )}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 text-center text-gray-500 text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
              <p className="font-bold text-gray-300 text-sm">No Incidents in this Category</p>
              <p className="mt-1 text-gray-500">Perimeter and belonging sensors are actively monitoring.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isResolved = alert.resolved === 1 || alert.acknowledged === 1;

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    !isResolved
                      ? alert.severity === 'CRITICAL'
                        ? 'bg-gray-900/95 border-rose-500/60 shadow-xl shadow-rose-500/10'
                        : 'bg-gray-900/95 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-gray-900/60 border-gray-800 text-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2.5 rounded-2xl border flex-shrink-0 ${
                        !isResolved
                          ? alert.severity === 'CRITICAL'
                            ? 'bg-rose-600/20 text-rose-400 border-rose-500/30'
                            : 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                          : 'bg-gray-800 text-emerald-400 border-gray-700'
                      }`}>
                        {isResolved ? (
                          <Check className="w-5 h-5" />
                        ) : alert.severity === 'CRITICAL' ? (
                          <AlertOctagon className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(alert.severity, isResolved)}`}>
                            {isResolved ? 'RESOLVED' : alert.severity}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            alert.alert_type === 'INTRUSION' || alert.security_mode === 'AREA'
                              ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                              : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                          }`}>
                            {alert.alert_type === 'INTRUSION' || alert.security_mode === 'AREA' ? 'AREA (HC-SR501)' : 'BELONGING (MPU6050)'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-1.5">{alert.title}</h4>
                        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{alert.description}</p>

                        {alert.latitude && alert.longitude && (
                          <div className="flex items-center space-x-1 text-[11px] text-blue-400 mt-2 font-mono">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            <span>Bag Location: {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isResolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow flex items-center space-x-1 flex-shrink-0 ml-2"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Event History View */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          {/* Sensor Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'MPU6050', 'PIR', 'GPS', 'SYSTEM', 'BUZZER'].map((sensor) => (
              <button
                key={sensor}
                onClick={() => setFilterSensor(sensor)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  filterSensor === sensor
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {sensor}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Permanent Audit Trail ({filteredEvents.length})
            </span>
            {events.length > 0 && (
              <button
                onClick={() => clearEvents()}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 text-center text-gray-500 text-xs">
              <History className="w-10 h-10 mx-auto mb-2 text-gray-700" />
              <p>No historical events logged for this filter.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-2xl bg-gray-900/90 border border-gray-800/80 flex items-start space-x-3 text-xs"
                >
                  <div className="p-2 rounded-xl bg-gray-950 border border-gray-800 flex-shrink-0 mt-0.5">
                    {getSensorIcon(evt.sensor)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-200 text-xs truncate">
                        {evt.event_type}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap ml-2">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 leading-snug">{evt.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-blue-400">
                        Sensor: {evt.sensor}
                      </span>
                      <span className="text-gray-700">•</span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Device: {evt.device_id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
