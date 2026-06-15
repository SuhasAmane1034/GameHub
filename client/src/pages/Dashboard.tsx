import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/StatCard.js';
import { IndianRupee, Play, Monitor, Users, Activity, TrendingUp, Bell } from 'lucide-react';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';
import { useSettingsStore } from '../store/useSettingsStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const Dashboard: React.FC = () => {
  const { fetchSessions, sessions, toasts } = useSessionTimerStore();
  const { fetchSettings } = useSettingsStore();

  const [summary, setSummary] = useState({
    todayRevenue: 0,
    activeSessions: 0,
    availablePS5s: 0,
    availablePCs: 0,
    todayCustomers: 0,
    monthlyRevenue: 0,
  });

  const [analytics, setAnalytics] = useState<any>({
    revenueTrend: [],
    hourlyOccupancy: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch summary
      const sumRes = await fetch(`${API_URL}/reports/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sumData = await sumRes.json();
      if (sumRes.ok) setSummary(sumData);

      // Fetch charts analytics
      const analRes = await fetch(`${API_URL}/reports/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const analData = await analRes.json();
      if (analRes.ok) setAnalytics(analData);

    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchSessions();
    fetchReports();

    // Refresh metrics summary every 30 seconds
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, [sessions.length]); // Refresh summary if sessions count changes

  const statCards = [
    { title: "Today's Revenue", value: summary.todayRevenue, prefix: '₹', icon: IndianRupee, color: 'success' as const, trend: { value: 12, isPositive: true } },
    { title: "Active Sessions", value: summary.activeSessions, icon: Play, color: 'primary' as const },
    { title: "Available PS5s", value: summary.availablePS5s, icon: Monitor, color: 'secondary' as const },
    { title: "Available PCs", value: summary.availablePCs, icon: Monitor, color: 'warning' as const },
    { title: "Today's Customers", value: summary.todayCustomers, icon: Users, color: 'primary' as const },
    { title: "Monthly Revenue", value: summary.monthlyRevenue, prefix: '₹', icon: IndianRupee, color: 'success' as const, trend: { value: 8, isPositive: true } },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Management Console
        </h2>
        <p className="text-xs text-game-muted mt-0.5">
          Real-time metrics and cyber cafe analytics tracker
        </p>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Analytics Charts & Live Alerts feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-game-primary" />
              Revenue & Session Trend (Last 7 Days)
            </h3>
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-game-success px-2 py-0.5 rounded font-bold uppercase">
              Live Feed
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8CFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5B8CFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141B34', borderColor: '#1E293B', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} />
                <Area type="monotone" name="Revenue (₹)" dataKey="revenue" stroke="#5B8CFF" strokeWidth={2} fillOpacity={1} fill="url(#revenueGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Alerts feed */}
        <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4">
              <Bell className="w-4 h-4 text-game-secondary" />
              Live System Notifications
            </h3>
            
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {toasts.length === 0 ? (
                <div className="text-center py-14 text-game-muted space-y-2">
                  <Activity className="w-7 h-7 text-slate-700 mx-auto" />
                  <p className="text-xs">No active alerts. System status operational.</p>
                </div>
              ) : (
                toasts.map(toast => (
                  <div key={toast.id} className="p-3 bg-[#0B1020]/80 border border-slate-800 rounded-lg flex gap-3 items-start">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      toast.type === 'danger' ? 'bg-game-danger' : toast.type === 'warning' ? 'bg-game-warning' : 'bg-game-primary'
                    }`}></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium leading-relaxed">{toast.message}</p>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                        {new Date(toast.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-game-muted font-bold uppercase tracking-widest text-center border-t border-slate-800/80 pt-3 mt-4">
            Manager Engine v1.0.0
          </div>
        </div>
      </div>

      {/* Hourly Occupancy metrics chart */}
      <div className="bg-[#141B34] border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-purple-400" />
          Peak Hour Occupancy Loads
        </h3>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourlyOccupancy} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
              <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#141B34', borderColor: '#1E293B', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <Bar name="Occupancy %" dataKey="occupancy" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
