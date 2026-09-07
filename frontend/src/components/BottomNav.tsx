import React from 'react';
import { Shield, Activity, MapPin, Bell, Cpu, Sliders } from 'lucide-react';
import { AppTab } from '../types/index.js';
import { useDevice } from '../context/DeviceContext.js';

interface BottomNavProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { alerts } = useDevice();
  const unreadAlerts = alerts.filter((a) => a.acknowledged === 0).length;

  const navItems: { id: AppTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'sensors', label: 'Sensors', icon: Activity },
    { id: 'location', label: 'GPS Live', icon: MapPin },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts },
    { id: 'health', label: 'Health', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-lg border-t border-gray-800/80 px-2 py-1.5 pb-safe select-none">
      <div className="max-w-md mx-auto grid grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400 bg-blue-500/10 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
