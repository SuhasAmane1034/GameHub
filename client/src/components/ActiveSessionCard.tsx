import React, { useState } from 'react';
import { Play, Pause, Square, Plus, User, Smartphone, Gamepad2, CreditCard, Clock } from 'lucide-react';
import { Session, useSessionTimerStore } from '../store/useSessionTimerStore.js';

interface ActiveSessionCardProps {
  session: Session;
  onEndSession: (invoice: any) => void;
}

export const ActiveSessionCard: React.FC<ActiveSessionCardProps> = ({ session, onEndSession }) => {
  const { pauseSession, resumeSession, extendSession, endSession } = useSessionTimerStore();
  const [showExtendInput, setShowExtendInput] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [isEnding, setIsEnding] = useState(false);

  // Time formatter (seconds -> HH:MM:SS)
  const formatTime = (totalSeconds?: number) => {
    if (totalSeconds === undefined) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const handlePauseResume = async () => {
    if (session.status === 'active') {
      await pauseSession(session._id);
    } else {
      await resumeSession(session._id);
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (extendMinutes > 0) {
      await extendSession(session._id, Number(extendMinutes));
      setShowExtendInput(false);
    }
  };

  const handleEnd = async () => {
    if (window.confirm(`Are you sure you want to end session for ${session.customerName}?`)) {
      setIsEnding(true);
      const invoice = await endSession(session._id);
      setIsEnding(false);
      if (invoice) {
        onEndSession(invoice);
      }
    }
  };

  // Calculate progress bar percentage
  const durationSeconds = session.duration * 60;
  const elapsed = session.liveElapsedSeconds || 0;
  let progressPercent = 0;
  if (session.duration > 0) {
    progressPercent = Math.min(100, (elapsed / durationSeconds) * 100);
  }

  const isUnlimited = session.duration === -1;
  const isPaused = session.status === 'paused';

  // Card themes depending on hardware type
  const isPs5 = session.deviceId.startsWith('PS5');
  const deviceBorder = isPaused 
    ? 'border-yellow-500/30' 
    : isPs5 
      ? 'border-game-primary/30 shadow-neon-primary' 
      : 'border-game-secondary/30 shadow-neon-secondary';

  return (
    <div className={`glass-panel rounded-xl p-5 border transition-all duration-300 ${deviceBorder}`}>
      {/* Top Header info */}
      <div className="flex justify-between items-start">
        <div>
          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
            isPs5 
              ? 'bg-blue-950/40 text-game-primary border-blue-800/50' 
              : 'bg-purple-950/40 text-purple-400 border-purple-800/50'
          }`}>
            {session.deviceId}
          </span>
          <h4 className="text-base font-bold text-white mt-1.5 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-500" />
            {session.customerName}
          </h4>
          <p className="text-xs text-game-muted flex items-center gap-1.5 mt-0.5">
            <Smartphone className="w-3.5 h-3.5" />
            {session.customerPhone}
          </p>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            isPaused
              ? 'bg-game-warning/10 text-game-warning border border-game-warning/30'
              : 'bg-game-success/10 text-game-success border border-game-success/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-game-warning' : 'bg-game-success pulse-indicator'}`}></span>
            {session.status}
          </span>
          <p className="text-[10px] font-bold text-game-muted mt-2">PLAYERS</p>
          <p className="text-sm font-bold text-white leading-none">{session.playersCount}</p>
        </div>
      </div>

      {/* Game and rate details */}
      <div className="mt-4 flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-game-muted" />
          <div className="text-left">
            <p className="text-[9px] text-game-muted font-bold leading-none">CURRENT GAME</p>
            <p className="text-xs font-semibold text-white mt-0.5">{session.gameName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-game-muted font-bold leading-none">HOURLY RATE</p>
          <p className="text-xs font-semibold text-white mt-0.5">₹{session.pricingRate}/hr</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-game-muted flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(session.liveElapsedSeconds)}
          </span>
          <span className="text-white">
            {isUnlimited ? 'Unlimited Play' : `Rem: ${formatTime(session.liveRemainingSeconds)}`}
          </span>
        </div>
        
        {/* Visual Bar */}
        <div className="w-full h-2 bg-[#0B1020] rounded-full overflow-hidden border border-slate-900">
          {isUnlimited ? (
            <div 
              className={`h-full bg-gradient-to-r from-game-primary to-game-secondary w-full`}
              style={{
                animation: isPaused ? 'none' : 'pulse-glow 2s infinite ease-in-out',
                opacity: isPaused ? 0.4 : 1
              }}
            />
          ) : (
            <div 
              className={`h-full bg-gradient-to-r ${isPs5 ? 'from-blue-500 to-game-primary' : 'from-purple-500 to-game-secondary'} transition-all duration-1000`} 
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
      </div>

      {/* Charge accrual */}
      <div className="mt-4 flex justify-between items-center py-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-game-success" />
          <span className="text-xs text-game-muted font-bold">LIVE ACCRUED AMOUNT:</span>
        </div>
        <span className="text-lg font-black text-game-success font-mono">
          ₹{session.liveCost || 0}
        </span>
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-2">
        {/* Pause/Resume Button */}
        <button
          onClick={handlePauseResume}
          className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            isPaused
              ? 'bg-game-warning/20 border-game-warning text-game-warning hover:bg-game-warning/30'
              : 'bg-slate-800/80 border-slate-700 text-game-muted hover:text-white hover:bg-slate-700/80'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </>
          )}
        </button>

        {/* Extend Button (Only if duration is limited) */}
        {!isUnlimited && (
          <button
            onClick={() => setShowExtendInput(!showExtendInput)}
            className="py-1.5 px-3 rounded-lg border border-slate-700 text-game-muted hover:text-white hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Extend
          </button>
        )}

        {/* End Button */}
        <button
          onClick={handleEnd}
          disabled={isEnding}
          className="py-1.5 px-3 rounded-lg bg-game-danger/20 border border-game-danger/30 text-game-danger hover:bg-game-danger/35 active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          {isEnding ? 'Ending...' : 'Checkout'}
        </button>
      </div>

      {/* Inline Extend Form */}
      {showExtendInput && (
        <form onSubmit={handleExtend} className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[9px] font-bold text-game-muted uppercase mb-1">EXTEND BY (MINUTES)</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-game-primary"
              value={extendMinutes}
              onChange={e => setExtendMinutes(Number(e.target.value))}
            >
              <option value="15">15 Min</option>
              <option value="30">30 Min</option>
              <option value="60">60 Min (1h)</option>
              <option value="120">120 Min (2h)</option>
            </select>
          </div>
          <div className="flex gap-1.5 self-end">
            <button
              type="button"
              onClick={() => setShowExtendInput(false)}
              className="px-2 py-1 rounded bg-slate-800 text-game-muted hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-1 rounded bg-game-primary text-white text-xs font-semibold shadow shadow-game-primary/30"
            >
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
