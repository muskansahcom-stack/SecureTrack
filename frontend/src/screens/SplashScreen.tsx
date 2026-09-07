import React from 'react';
import { Shield, Lock, Radio, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0b0f19] via-[#0f172a] to-[#0b0f19] flex flex-col justify-between p-6 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase font-semibold">
            System Online
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">v1.0.0</span>
      </div>

      {/* Center Hero */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-blue-400/40">
            <Shield className="w-14 h-14 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-gray-900 border border-gray-700 text-emerald-400 shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          SECURE<span className="text-blue-400">BELONG</span>
        </h1>
        <p className="text-sm text-gray-400 mt-2 font-medium max-w-xs">
          IoT-Based Personal Belonging & Area Perimeter Security System
        </p>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2.5 mt-8 w-full max-w-xs text-left">
          <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <div>
              <p className="text-[11px] font-bold text-gray-200">MPU6050 Motion</p>
              <p className="text-[10px] text-gray-400">Belonging Theft Alert</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
            <div>
              <p className="text-[11px] font-bold text-gray-200">HC-SR501 PIR</p>
              <p className="text-[10px] text-gray-400">Perimeter Intrusion</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <div>
              <p className="text-[11px] font-bold text-gray-200">NEO-6M GPS</p>
              <p className="text-[10px] text-gray-400">Real-Time Coordinates</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-400"></div>
            <div>
              <p className="text-[11px] font-bold text-gray-200">Active Buzzer</p>
              <p className="text-[10px] text-gray-400">Physical Deterrent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-md mx-auto mb-4">
        <button
          onClick={onComplete}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-98"
        >
          <span>ENTER SYSTEM</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[11px] text-gray-500 mt-3 font-mono">
          ESP32 Wi-Fi & MQTT Gateway Ready
        </p>
      </div>
    </div>
  );
};
