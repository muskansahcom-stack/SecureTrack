import React, { useState } from 'react';
import { Shield, Lock, Mail, Phone, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface AuthScreenProps {
  onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('muskan@securebelong.com');
  const [password, setPassword] = useState('password123');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter your email address');
        if (!password) throw new Error('Please create a password');
        await register(name, email, phone, password);
      } else {
        if (!identifier.trim()) throw new Error('Please enter your Email or Phone Number');
        if (!password) throw new Error('Please enter your password');
        await login(identifier, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex flex-col justify-center px-4 py-8 select-none text-gray-100 relative overflow-hidden">
      {/* Background cyber glow gradients */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-7">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/25 mb-3.5 ring-4 ring-blue-500/15">
            <Shield className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Welcome to SecureBelong</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">Personal IoT Security & Live Asset Protection Platform</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-900/95 border border-gray-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-950/80 rounded-2xl mb-6 border border-gray-800">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                !isRegister
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                isRegister
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Create Account</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister ? (
              // REGISTER FORM FIELDS
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Muskan Sah"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="muskan@securebelong.com"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Phone Number <span className="text-gray-500 font-normal">(Optional for SMS alerts)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              // LOGIN FORM FIELDS
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email ID or Phone Number</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email ID or Mobile Number"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-950/90 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Security Credentials...' : isRegister ? 'Register & Access Dashboard' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials hint */}
          <div className="mt-5 pt-4 border-t border-gray-800/80 text-center">
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-gray-400 bg-gray-950 px-3 py-1.5 rounded-full border border-gray-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Demo Login: <strong className="text-gray-200">muskan@securebelong.com</strong> / <strong className="text-gray-200">password123</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
