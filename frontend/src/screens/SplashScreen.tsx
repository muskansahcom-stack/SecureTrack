import React from 'react';
import { Radio, Activity, Compass, Volume2, ArrowRight, Cpu } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#070a12] text-white flex flex-col justify-between p-6 md:p-10 overflow-y-auto select-none">
      {/* Top Status Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
            SYSTEM ONLINE
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">ESP32 DevKit V1</span>
          <span className="text-gray-600">•</span>
          <span>v1.0.0-PRO</span>
        </div>
      </header>

      {/* Main Hero & Hardware Cards */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6 flex flex-col items-center text-center">
        {/* Logo Artwork Container */}
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-blue-500/25 rounded-3xl blur-3xl animate-pulse" />
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/40 border-2 border-blue-500/40 bg-gray-950">
            <img
              src="/logo.png"
              alt="SecureBelong IoT Platform"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Brand Titles */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          SECURE<span className="text-blue-400">BELONG</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-300 mt-2 font-medium max-w-lg leading-relaxed">
          IoT-Based Personal Belonging & Area Perimeter Security System
        </p>
        <p className="text-xs font-mono text-cyan-400 mt-1">
          ESP32 Wi-Fi + MQTT Gateway Ready
        </p>

        {/* 4 Actual Physical Hardware Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8 w-full text-left">
          {/* Hardware 1: MPU6050 */}
          <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800/90 hover:border-blue-500/40 transition shadow-lg flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                MPU6050 GY-521
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">Movement Detection</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                Laptop bag, luggage & valuables 6-DOF IMU motion detection.
              </p>
            </div>
          </div>

          {/* Hardware 2: HC-SR501 PIR */}
          <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800/90 hover:border-indigo-500/40 transition shadow-lg flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                HC-SR501 PIR
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">Area Motion Detection</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                Hostel room, lab, office & perimeter human intrusion tripwire.
              </p>
            </div>
          </div>

          {/* Hardware 3: NEO-6M GPS */}
          <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800/90 hover:border-emerald-500/40 transition shadow-lg flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                NEO-6M GPS
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">Real-Time GPS</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                Live coordinates, velocity & satellite theft breadcrumb tracking.
              </p>
            </div>
          </div>

          {/* Hardware 4: Active Buzzer */}
          <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800/90 hover:border-rose-500/40 transition shadow-lg flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block">
                ACTIVE BUZZER
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">Physical Alarm</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                High-decibel hardware acoustic deterrent with 2-way web control.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom CTA */}
      <footer className="max-w-md w-full mx-auto pb-4">
        <button
          onClick={onComplete}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-blue-500/30 flex items-center justify-center space-x-2 transition-all transform active:scale-98"
        >
          <span>ENTER SYSTEM</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center space-x-4 text-[11px] font-mono text-gray-500 mt-3">
          <span>Wi-Fi 802.11 b/g/n</span>
          <span>•</span>
          <span>MQTT QoS 1</span>
          <span>•</span>
          <span>Full Duplex Gateway</span>
        </div>
      </footer>
    </div>
  );
};
