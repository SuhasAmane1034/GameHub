import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { Gamepad2, ShieldAlert, User, KeyRound, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, error, clearError, isLoading, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      onSuccess();
    }
  };

  const fillCredentials = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setEmail('admin@gamehub.com');
      setPassword('admin123');
    } else {
      setEmail('staff@gamehub.com');
      setPassword('staff123');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Graphic Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-game-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-game-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#141B34]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/80 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-game-primary to-game-secondary flex items-center justify-center mx-auto shadow-neon-primary mb-4 border border-white/10">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">
            GAMEHUB MANAGER
          </h1>
          <p className="text-xs text-game-muted font-medium uppercase tracking-widest">
            CAFE MANAGEMENT OS
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-game-danger/10 border border-game-danger/20 text-game-danger text-xs font-semibold rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Email field */}
            <div>
              <label className="block text-[10px] font-bold text-game-muted uppercase mb-1.5 tracking-wider">
                Authorized Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  className="w-full game-input pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[10px] font-bold text-game-muted uppercase mb-1.5 tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full game-input pl-10 font-mono"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-1.5 text-sm uppercase tracking-wider font-bold"
          >
            {isLoading ? 'Decrypting Security...' : 'Access Console'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Pre-seeds (Extremely useful for review) */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">
            Quick fill roles (Demo Accounts)
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => fillCredentials('admin')}
              className="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-game-primary/30 text-game-muted hover:text-white text-xs font-semibold transition-all duration-200"
            >
              Admin Portal
            </button>
            <button
              onClick={() => fillCredentials('staff')}
              className="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-game-secondary/30 text-game-muted hover:text-white text-xs font-semibold transition-all duration-200"
            >
              Staff Portal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
