import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Login } from './pages/Login.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
import { Dashboard } from './pages/Dashboard.js';
import { Stations } from './pages/Stations.js';
import { Sessions } from './pages/Sessions.js';
import { Bookings } from './pages/Bookings.js';
import { Customers } from './pages/Customers.js';
import { Billing } from './pages/Billing.js';
import { Reports } from './pages/Reports.js';
import { SettingsPage } from './pages/Settings.js';
import { FloorView } from './pages/FloorView.js';
import { CommandPalette } from './components/CommandPalette.js';
import { StartSessionModal } from './components/StartSessionModal.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useSessionTimerStore } from './store/useSessionTimerStore.js';
import { CustomerPortal } from './pages/CustomerPortal.js';
import { useThemeStore } from './store/useThemeStore.js';
import { Search, Play, Bell, Shield, Keyboard, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const { isAuthenticated, checkAuth, user, logout } = useAuthStore();
  const { fetchSessions, startTicker, stopTicker, toasts, removeToast, addToast } = useSessionTimerStore();
  const { theme, fetchThemeSettings, initSocket, socket } = useThemeStore();
  
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const [newBookingAlert, setNewBookingAlert] = useState<any>(null);

  // Path routing change sync listener
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch dynamic branding & theme and init socket synchronizer
  useEffect(() => {
    fetchThemeSettings();
    initSocket();
  }, []);

  // Listen for new booking notifications
  useEffect(() => {
    if (!socket) return;

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(293.66, audioCtx.currentTime); // D4
        osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15); // A4

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.35);
        osc2.stop(audioCtx.currentTime + 0.35);
      } catch (e) {
        console.error('AudioContext sound failed:', e);
      }
    };

    const handleNewBooking = (data: any) => {
      console.log('🔔 Socket received new booking alert:', data);
      playNotificationSound();
      setNewBookingAlert(data.booking);
      addToast(data.message, 'success');
    };

    socket.on('new_booking_notification', handleNewBooking);
    return () => {
      socket.off('new_booking_notification', handleNewBooking);
    };
  }, [socket, addToast]);

  // Check auth on mount
  useEffect(() => {
    if (!path.startsWith('/portal')) {
      checkAuth();
    }
  }, [path]);

  // Route customer portal immediately if path matches
  if (path.startsWith('/portal')) {
    return <CustomerPortal />;
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      startTicker();
    } else {
      stopTicker();
    }
    return () => stopTicker();
  }, [isAuthenticated]);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <Login onSuccess={() => setCurrentTab('dashboard')} />;
  }

  // Handle TV view, which takes over the whole screen
  if (currentTab === 'floor') {
    return (
      <div className="relative">
        <FloorView />
        <button
          onClick={() => setCurrentTab('dashboard')}
          className="fixed bottom-6 right-6 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg z-50 shadow-lg"
        >
          Exit TV View
        </button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'stations': return <Stations />;
      case 'sessions': return <Sessions />;
      case 'bookings': return <Bookings />;
      case 'customers': return <Customers />;
      case 'billing': return <Billing />;
      case 'reports': return <Reports />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  const pageTitles: { [key: string]: string } = {
    dashboard: 'Dashboard Overview',
    stations: 'Hardware Stations',
    sessions: 'Active Play Sessions',
    bookings: 'Reservations Calendar',
    customers: 'Client Database',
    billing: 'Invoices & Ledger',
    reports: 'Deep Analytics',
    settings: 'Cafe Configurations',
  };

  const getBgStyle = () => {
    if (theme.backgroundStyle === 'glassmorphism') return 'theme-bg-glassmorphism';
    if (theme.backgroundStyle === 'gradient') return 'theme-bg-gradient';
    if (theme.backgroundStyle === 'neon') return 'theme-bg-neon';
    if (theme.backgroundStyle === 'rgb') return 'theme-bg-rgb';
    return 'theme-bg-solid';
  };

  return (
    <div className={`flex h-screen overflow-hidden ${getBgStyle()} text-white transition-theme`}>
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onChangeTab={(tab) => setCurrentTab(tab)} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-radial from-game-card/5 to-game-bg/40 backdrop-blur-[2px]">
        
        {/* Main top header */}
        <header className="h-16 border-b border-game-border bg-game-bg/40 backdrop-blur-md flex items-center justify-between px-8 shrink-0 relative z-30">
          {/* Active section title */}
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {pageTitles[currentTab] || 'OS Console'}
            </h2>
          </div>

          {/* Action elements */}
          <div className="flex items-center gap-4">
            
            {/* Command Palette Indicator (Ctrl+K) */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="bg-[#141B34] border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition-all rounded-lg py-1.5 px-3 flex items-center gap-2 text-[11px] font-semibold text-game-muted"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Actions</span>
              <kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/50 text-[9px] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Quick Session Launcher */}
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3.5 font-bold"
            >
              <Play className="w-3 h-3 fill-white" />
              New Session
            </button>
          </div>
        </header>

        {/* Scrollable Work View */}
        <main className="flex-1 overflow-y-auto p-8 bg-game-bg/20">
          {renderTabContent()}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
        onStartSession={() => setIsStartModalOpen(true)}
        onLogout={logout}
      />

      {/* Global Start Session Modal */}
      <StartSessionModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onSuccess={() => fetchSessions()}
      />

      {/* Real-time Toaster Slide notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex gap-3 cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] ${
              toast.type === 'danger' 
                ? 'bg-red-950/90 border-game-danger/40 text-white shadow-neon-danger' 
                : toast.type === 'warning'
                  ? 'bg-yellow-950/90 border-game-warning/40 text-white'
                  : 'bg-[#141B34]/95 border-game-primary/30 text-white shadow-neon-primary'
            }`}
          >
            {toast.type === 'danger' ? (
              <ShieldAlert className="w-5 h-5 text-game-danger shrink-0 mt-0.5" />
            ) : (
              <Bell className="w-5 h-5 text-game-primary shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-normal">{toast.message}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                Click to dismiss
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Center Popup Alert for New Bookings */}
      {newBookingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141B34] border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 text-center space-y-5">
            <div className="flex flex-col items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-game-primary pulse-indicator mb-1"></span>
              <h3 className="text-base font-black uppercase tracking-wider text-white text-glow-primary">
                New Booking Alert!
              </h3>
              <p className="text-xs text-game-muted font-medium">
                A guest has submitted a booking request via the Customer Portal.
              </p>
            </div>

            {/* Info details grid */}
            <div className="bg-[#0B1020]/70 border border-slate-800/80 p-4 rounded-lg text-left text-xs font-bold space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Booking ID:</span>
                <span className="text-white font-mono uppercase font-black">{newBookingAlert.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Guest Name:</span>
                <span className="text-white">{newBookingAlert.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Phone Number:</span>
                <span className="text-white">{newBookingAlert.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Station:</span>
                <span className="text-white uppercase font-black text-game-primary">{newBookingAlert.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Time Slot:</span>
                <span className="text-white font-black">{newBookingAlert.date} @ {newBookingAlert.timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[9px]">Total Amount:</span>
                <span className="text-white font-black font-mono">₹{newBookingAlert.amount}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/bookings/${newBookingAlert._id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ status: 'confirmed' })
                    });
                    if (res.ok) {
                      addToast(`Booking ${newBookingAlert.bookingId} approved!`, 'success');
                    } else {
                      addToast('Failed to approve booking', 'danger');
                    }
                  } catch (e) {
                    console.error(e);
                  }
                  setNewBookingAlert(null);
                }}
                className="btn-primary py-2 text-xs font-bold uppercase tracking-wider"
              >
                Approve Request
              </button>
              
              <button
                onClick={() => {
                  setCurrentTab('bookings');
                  setNewBookingAlert(null);
                }}
                className="btn-secondary py-2 text-xs font-bold uppercase tracking-wider"
              >
                View Calendar
              </button>
            </div>

            <button
              onClick={() => setNewBookingAlert(null)}
              className="text-[9px] text-slate-500 hover:text-white uppercase font-extrabold block mx-auto pt-1"
            >
              Dismiss Notification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
