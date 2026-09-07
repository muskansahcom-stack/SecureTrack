import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { DeviceProvider } from './context/DeviceContext.js';
import { AppTab } from './types/index.js';
import { Navbar } from './components/Navbar.js';
import { BottomNav } from './components/BottomNav.js';
import { AlertBanner } from './components/AlertBanner.js';
import { TestModeBanner } from './components/TestModeBanner.js';

import { SplashScreen } from './screens/SplashScreen.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { DeviceSetupScreen } from './screens/DeviceSetupScreen.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { SensorsScreen } from './screens/SensorsScreen.js';
import { LiveLocationScreen } from './screens/LiveLocationScreen.js';
import { AlertsScreen } from './screens/AlertsScreen.js';
import { DeviceHealthScreen } from './screens/DeviceHealthScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';

import { useAuth } from './context/AuthContext.js';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-mono">Authenticating SecureBelong...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onSuccess={() => {}} />;
  }

  if (showSetup) {
    return <DeviceSetupScreen onComplete={() => setShowSetup(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-gray-100 flex flex-col justify-between">
      {/* Top Fixed Header */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Persistent Test Mode Bar if active */}
      <TestModeBanner />

      {/* Floating High Priority Alert Banner */}
      <AlertBanner />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pt-3">
        {currentTab === 'dashboard' && <DashboardScreen setCurrentTab={setCurrentTab} />}
        {currentTab === 'sensors' && <SensorsScreen />}
        {currentTab === 'location' && <LiveLocationScreen />}
        {currentTab === 'alerts' && <AlertsScreen />}
        {currentTab === 'health' && <DeviceHealthScreen />}
        {currentTab === 'settings' && <SettingsScreen />}
      </main>

      {/* Bottom Tab Navigation */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DeviceProvider>
        <MainApp />
      </DeviceProvider>
    </AuthProvider>
  );
};

export default App;
