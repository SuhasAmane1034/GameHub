import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Monitor, Play, Calendar, Users, FileText, BarChart2, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useSessionTimerStore } from '../store/useSessionTimerStore.js';
import { useThemeStore } from '../store/useThemeStore.js';

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onChangeTab }) => {
  const { user, logout } = useAuthStore();
  const { sessions } = useSessionTimerStore();
  const { cafeInfo, theme } = useThemeStore();
  const [time, setTime] = useState(new Date());

  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const brandName = cafeInfo?.name || theme.brandName || 'GameHub';
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'staff'] },
    { id: 'stations', label: 'Gaming Stations', icon: <Monitor className="w-5 h-5" />, roles: ['admin', 'staff'] },
    { id: 'floor', label: 'Floor View (TV)', icon: <Monitor className="w-5 h-5 text-purple-400" />, badge: 'TV', roles: ['admin', 'staff'] },
    { 
      id: 'sessions', 
      label: 'Sessions', 
      icon: <Play className="w-5 h-5" />, 
      badge: activeSessionsCount > 0 ? activeSessionsCount.toString() : undefined,
      roles: ['admin', 'staff'] 
    },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" />, roles: ['admin', 'staff'] },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
    { id: 'billing', label: 'Billing', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'staff'] },
    { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-5 h-5" />, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 h-screen border-r border-slate-800 bg-[#0B1020] flex flex-col justify-between shrink-0">
      <div>
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-game-primary to-game-secondary flex items-center justify-center font-bold text-white shadow-neon-primary text-sm overflow-hidden shrink-0">
            {cafeInfo?.logoUrl ? (
              <img src={cafeInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              getInitials(brandName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-white text-sm tracking-wide uppercase leading-none truncate" title={brandName}>
              {brandName}
            </h1>
            <span className="text-[9px] text-game-primary tracking-wider uppercase font-semibold block mt-0.5 truncate" title={cafeInfo?.tagline || 'Manager OS'}>
              {cafeInfo?.tagline || 'Manager OS'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1">
          {filteredMenu.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-white border-l-4 border-game-primary'
                    : 'text-game-muted hover:bg-slate-900 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.badge === 'TV' 
                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                      : 'bg-game-primary text-white shadow-neon-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Details & Clock */}
      <div className="border-t border-slate-800 p-4 space-y-4">
        {/* Digital Clock */}
        <div className="bg-[#141B34] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-white font-mono tracking-widest text-glow-primary">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div className="text-[10px] text-game-muted font-medium mt-1">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm">
              {user?.name.substring(0, 2)}
            </div>
            <div>
              <p className="text-xs font-semibold text-white max-w-[120px] truncate leading-none">
                {user?.name}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-game-success pulse-indicator"></span>
                <span className="text-[9px] text-game-muted font-bold capitalize">
                  {user?.role} Role
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-game-muted hover:text-game-danger hover:bg-slate-900 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
