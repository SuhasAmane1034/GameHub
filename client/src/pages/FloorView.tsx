import React, { useEffect, useState } from 'react';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';
import { Gamepad2, Monitor, Tv, Info, Users, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Device {
  _id: string;
  deviceId: string;
  name: string;
  type: 'PS5' | 'PC' | 'PC_Controller';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentCustomer?: string;
  activeSessionId?: string;
}

export const FloorView: React.FC = () => {
  const { sessions } = useSessionTimerStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [sessions.length]);

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDevices(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: Format countdown timer (seconds -> HH:MM:SS)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.round(secs % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  // Map active sessions details onto devices
  const floorDevices = devices.map(d => {
    const activeSession = sessions.find(s => s._id === d.activeSessionId && s.status !== 'completed');
    return {
      ...d,
      activeSession,
    };
  });

  const ps5Devices = floorDevices.filter(d => d.type === 'PS5');
  const pcDevices = floorDevices.filter(d => d.type === 'PC' || d.type === 'PC_Controller');

  const getStatusStyle = (status: Device['status']) => {
    switch (status) {
      case 'available':
        return {
          card: 'bg-green-950/20 border-game-success/40 shadow-neon-success',
          text: 'text-game-success',
          badge: 'bg-game-success text-white',
          glow: 'bg-game-success'
        };
      case 'occupied':
        return {
          card: 'bg-red-950/20 border-game-danger/40 shadow-neon-danger',
          text: 'text-game-danger',
          badge: 'bg-game-danger text-white',
          glow: 'bg-game-danger'
        };
      case 'reserved':
        return {
          card: 'bg-yellow-950/20 border-game-warning/40 shadow-sm',
          text: 'text-game-warning',
          badge: 'bg-game-warning text-black',
          glow: 'bg-game-warning'
        };
      case 'maintenance':
      default:
        return {
          card: 'bg-slate-900/40 border-slate-700/50',
          text: 'text-game-muted',
          badge: 'bg-slate-700 text-white',
          glow: 'bg-slate-500'
        };
    }
  };

  return (
    <div className="h-screen bg-[#0B1020] p-6 flex flex-col justify-between overflow-hidden relative">
      {/* Visual background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

      {/* Arena TV Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 shadow-neon-secondary flex items-center justify-center border border-white/10">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              GameHub Live Arena View
            </h1>
            <p className="text-[10px] text-game-primary uppercase font-bold tracking-widest leading-none mt-1">
              Real-Time Floor Tracking Screen
            </p>
          </div>
        </div>

        {/* Large Digital Clock for TV Lobby */}
        <div className="flex items-center gap-6">
          {/* Status Legends */}
          <div className="hidden md:flex gap-4 text-xs font-bold uppercase tracking-wider text-game-muted">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-game-success pulse-indicator"></span> Available</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-game-danger pulse-indicator"></span> Occupied</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-game-warning"></span> Reserved</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Maintenance</div>
          </div>
          
          <div className="text-right border-l border-slate-800 pl-6">
            <span className="text-2xl font-black text-white font-mono tracking-widest text-glow-primary">
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Floor Grid Layout */}
      <div className="flex-1 my-6 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        
        {/* PS5 ARENA SECTION */}
        <div className="border border-slate-800/80 bg-[#141B34]/30 backdrop-blur rounded-xl p-5 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2.5 shrink-0">
            <Gamepad2 className="w-5 h-5 text-game-primary" />
            <h3 className="font-extrabold text-white uppercase tracking-wider text-sm">
              PS5 Arena Zone
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1">
            {ps5Devices.map(d => {
              const styles = getStatusStyle(d.status);
              const timerText = d.activeSession
                ? d.activeSession.duration === -1
                  ? 'Unlimited'
                  : formatTime(d.activeSession.liveRemainingSeconds || 0)
                : 'Ready';

              return (
                <div key={d._id} className={`border rounded-xl p-4 flex flex-col justify-between h-32 transition-all duration-500 ${styles.card}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black text-white font-mono">{d.deviceId}</span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-white/5 uppercase ${styles.badge}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    {d.status === 'occupied' && d.activeSession ? (
                      <div>
                        <p className="text-[10px] text-white font-bold leading-none truncate flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {d.activeSession.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 truncate">
                          Playing: {d.activeSession.gameName}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-game-muted font-bold">Ready to Start</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-2 text-[10px]">
                    <span className="text-game-muted font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Timer
                    </span>
                    <span className={`font-mono font-extrabold ${d.status === 'occupied' ? 'text-game-danger text-glow-danger' : 'text-game-success'}`}>
                      {timerText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GAMING PC LAN ZONE */}
        <div className="border border-slate-800/80 bg-[#141B34]/30 backdrop-blur rounded-xl p-5 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2.5 shrink-0">
            <Monitor className="w-5 h-5 text-game-secondary" />
            <h3 className="font-extrabold text-white uppercase tracking-wider text-sm">
              PC LAN Zone
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1">
            {pcDevices.map(d => {
              const styles = getStatusStyle(d.status);
              const timerText = d.activeSession
                ? d.activeSession.duration === -1
                  ? 'Unlimited'
                  : formatTime(d.activeSession.liveRemainingSeconds || 0)
                : 'Ready';

              return (
                <div key={d._id} className={`border rounded-xl p-4 flex flex-col justify-between h-32 transition-all duration-500 ${styles.card}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black text-white font-mono">{d.deviceId}</span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-white/5 uppercase ${styles.badge}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    {d.status === 'occupied' && d.activeSession ? (
                      <div>
                        <p className="text-[10px] text-white font-bold leading-none truncate flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {d.activeSession.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 truncate">
                          Playing: {d.activeSession.gameName}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-game-muted font-bold">Ready to Start</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-2 text-[10px]">
                    <span className="text-game-muted font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Timer
                    </span>
                    <span className={`font-mono font-extrabold ${d.status === 'occupied' ? 'text-game-danger' : 'text-game-success'}`}>
                      {timerText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Arena Footer ticker */}
      <div className="h-10 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest relative z-10 shrink-0">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-game-primary shrink-0" />
          <span>Please contact front desk staff to start or pause your console session.</span>
        </div>
        <div>
          GameHub Manager OS v1.0
        </div>
      </div>
    </div>
  );
};
