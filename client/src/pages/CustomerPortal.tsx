import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { 
  Home, Activity, Gamepad2, IndianRupee, Calendar, Search, 
  MapPin, Phone, MessageSquare, Instagram, Clock, CheckCircle, 
  ArrowRight, ArrowLeft, Loader2, QrCode
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

interface DeviceData {
  _id: string;
  deviceId: string;
  name: string;
  type: 'PS5' | 'PC' | 'PC_Controller';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentCustomer: string;
  activeSessionId: string;
}

interface GameData {
  _id: string;
  title: string;
  genre: string;
  platform: string;
  maxPlayers: number;
  imageUrl: string;
}

interface CrowdStats {
  ps5Available: number;
  totalPs5: number;
  pcAvailable: number;
  totalPc: number;
  crowdLevel: string;
}

export const CustomerPortal: React.FC = () => {
  const { theme, cafeInfo, fetchThemeSettings, initSocket } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'home' | 'availability' | 'games' | 'pricing' | 'book' | 'track' | 'contact'>('home');

  // Live Data States
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [crowd, setCrowd] = useState<CrowdStats>({ ps5Available: 0, totalPs5: 0, pcAvailable: 0, totalPc: 0, crowdLevel: 'Low' });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Booking Form State
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    phoneNumber: '',
    deviceType: 'PS5' as 'PS5' | 'PC' | 'PC_Controller',
    deviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '12:00',
    duration: 1, // in hours
    playersCount: 1,
    gameName: '',
    notes: ''
  });
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Tracking State
  const [trackId, setTrackId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackedBooking, setTrackedBooking] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Games search
  const [gameSearch, setGameSearch] = useState('');
  const [gamePlatformFilter, setGamePlatformFilter] = useState('All');

  // Socket Reference
  const socketRef = useRef<Socket | null>(null);

  // Initialize Theme and Sockets
  useEffect(() => {
    fetchThemeSettings();
    initSocket();

    // Fetch initial datasets
    fetchInitialData();

    // Connect local socket for real-time occupancy
    console.log('🔌 Connecting Customer Portal local socket listener...');
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('devices_updated', () => {
      console.log('🔄 Sockets notified device occupancy updates. Reloading...');
      fetchDevicesAndCrowd();
    });

    socket.on('bookings_updated', () => {
      console.log('📅 Sockets notified booking updates. Syncing slots...');
      fetchDevicesAndCrowd();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchInitialData = async () => {
    setIsDataLoading(true);
    try {
      await Promise.all([
        fetchDevicesAndCrowd(),
        fetchPricing(),
        fetchGames()
      ]);
    } catch (e) {
      console.error('Failed to load portal data:', e);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchDevicesAndCrowd = async () => {
    try {
      const [devRes, crowdRes] = await Promise.all([
        fetch(`${API_URL}/public/devices`),
        fetch(`${API_URL}/public/crowd`)
      ]);
      const devData = await devRes.json();
      const crowdData = await crowdRes.json();
      setDevices(devData);
      setCrowd(crowdData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${API_URL}/public/pricing`);
      const data = await res.json();
      setPricing(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API_URL}/public/games`);
      const data = await res.json();
      setGames(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-select first available device when device type changes in booking
  useEffect(() => {
    const matchedDevices = devices.filter(
      d => d.type === bookingForm.deviceType && d.status === 'available'
    );
    if (matchedDevices.length > 0) {
      setBookingForm(prev => ({ ...prev, deviceId: matchedDevices[0].deviceId }));
    } else {
      // If none available, try any matching type
      const anyOfTypes = devices.filter(d => d.type === bookingForm.deviceType);
      if (anyOfTypes.length > 0) {
        setBookingForm(prev => ({ ...prev, deviceId: anyOfTypes[0].deviceId }));
      }
    }
  }, [bookingForm.deviceType, devices]);

  // Pricing helper
  const calculateTotalAmount = () => {
    if (!pricing) return 0;
    const rate = bookingForm.deviceType === 'PS5'
      ? (pricing.ps5[bookingForm.playersCount.toString()] || 100)
      : (bookingForm.deviceType === 'PC' ? pricing.pc.keyboard_mouse : pricing.pc.controller);
    
    return rate * bookingForm.duration;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBookingSubmitting(true);
    setBookingError('');

    // EndTime calculation (startTime format "HH:MM")
    let endTime = '13:00';
    try {
      const [h, m] = bookingForm.startTime.split(':').map(Number);
      const endHour = (h + bookingForm.duration) % 24;
      endTime = `${endHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } catch (e) {}

    const submitPayload = {
      customerName: bookingForm.customerName,
      phoneNumber: bookingForm.phoneNumber,
      deviceId: bookingForm.deviceId,
      date: bookingForm.date,
      startTime: bookingForm.startTime,
      endTime,
      duration: bookingForm.duration * 60, // save in minutes
      amount: calculateTotalAmount(),
      notes: bookingForm.notes
    };

    try {
      const res = await fetch(`${API_URL}/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Overlap conflicting slot or invalid station.');

      setConfirmedBooking(data);
      setBookingStep(8); // Show Success tab
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleTrackBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId || !trackPhone) return;

    setIsTrackingLoading(true);
    setTrackingError('');
    setTrackedBooking(null);

    try {
      const res = await fetch(`${API_URL}/public/bookings/${trackId.toUpperCase()}?phone=${trackPhone}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No matching booking found.');

      setTrackedBooking(data);
    } catch (err: any) {
      setTrackingError(err.message);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Card classes helper
  const getCardStyle = () => {
    if (theme.cardStyle === 'glass') return 'theme-card-glass';
    if (theme.cardStyle === 'sharp') return 'theme-card-sharp';
    if (theme.cardStyle === 'elevated') return 'theme-card-elevated';
    return 'theme-card-rounded';
  };

  // Background style helper
  const getBgStyle = () => {
    if (theme.backgroundStyle === 'glassmorphism') return 'theme-bg-glassmorphism';
    if (theme.backgroundStyle === 'gradient') return 'theme-bg-gradient';
    if (theme.backgroundStyle === 'neon') return 'theme-bg-neon';
    if (theme.backgroundStyle === 'rgb') return 'theme-bg-rgb';
    return 'theme-bg-solid';
  };

  const getStatusBadge = (status: DeviceData['status']) => {
    switch (status) {
      case 'available':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">Available</span>;
      case 'occupied':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">Occupied</span>;
      case 'reserved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 font-sans">Reserved</span>;
      case 'maintenance':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Maintenance</span>;
    }
  };

  // Filters logic
  const filteredGames = games.filter(game => {
    const matchSearch = game.title.toLowerCase().includes(gameSearch.toLowerCase());
    const matchPlatform = gamePlatformFilter === 'All' || game.platform.toLowerCase().includes(gamePlatformFilter.toLowerCase());
    return matchSearch && matchPlatform;
  });

  return (
    <div className={`min-h-screen ${getBgStyle()} text-white flex flex-col font-sans relative pb-20 md:pb-0`}>
      
      {/* 1. Header Navigation */}
      <header className="h-16 border-b border-slate-800/60 bg-[#0B1020]/70 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 md:px-12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-game-primary to-game-secondary flex items-center justify-center font-bold text-white shadow-neon-primary text-sm">
            {cafeInfo?.logoUrl ? <img src={cafeInfo.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" /> : 'GH'}
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-wide uppercase leading-none">
              {cafeInfo?.name || 'GameHub'}
            </h1>
            {cafeInfo?.tagline && (
              <span className="text-[9px] text-game-primary tracking-wider uppercase font-semibold block mt-0.5">
                {cafeInfo.tagline}
              </span>
            )}
          </div>
        </div>

        {/* Desktop Navbar Tabs */}
        <nav className="hidden md:flex items-center gap-2">
          {[
            { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
            { id: 'availability', label: 'Availability', icon: <Activity className="w-4 h-4" /> },
            { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
            { id: 'pricing', label: 'Pricing', icon: <IndianRupee className="w-4 h-4" /> },
            { id: 'book', label: 'Book Now', icon: <Calendar className="w-4 h-4" /> },
            { id: 'track', label: 'Track Booking', icon: <Calendar className="w-4 h-4 text-purple-400" /> },
            { id: 'contact', label: 'Contact', icon: <MapPin className="w-4 h-4" /> }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (item.id === 'book') setBookingStep(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-game-primary to-game-secondary text-white shadow-neon-primary' 
                  : 'text-game-muted hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 2. Main Page Router Container */}
      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full z-10">
        <AnimatePresence mode="wait">
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-game-primary animate-spin" />
              <p className="text-xs text-game-muted font-bold uppercase tracking-wider">Syncing Arena Status...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              
              {/* TAB 1: HOME */}
              {activeTab === 'home' && (
                <div className="space-y-12">
                  {/* Hero Intro */}
                  <div className="text-center space-y-4 py-8">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none uppercase">
                      {cafeInfo?.name || 'GameHub'}
                    </h2>
                    <p className="text-sm md:text-lg text-game-muted max-w-lg mx-auto font-medium">
                      {cafeInfo?.tagline || 'Your Ultimate Gaming Destination'}. Book state-of-the-art PS5 setups and high-end Gaming LAN PCs instantly.
                    </p>
                    <div className="flex items-center justify-center gap-4 pt-4">
                      <button onClick={() => { setActiveTab('book'); setBookingStep(1); }} className="btn-primary py-2.5 px-6 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        Book Session Now
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => setActiveTab('availability')} className="btn-secondary py-2.5 px-6 font-bold uppercase text-xs tracking-wider">
                        Check Availability
                      </button>
                    </div>
                  </div>

                  {/* Realtime Statistics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${getCardStyle()} theme-rounded p-6 flex flex-col items-center justify-center text-center`}>
                      <span className="text-[10px] font-bold uppercase text-game-muted tracking-widest mb-1">PS5 Availability</span>
                      <p className="text-3xl font-black text-white text-glow-primary">
                        {crowd.ps5Available} / {crowd.totalPs5}
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1 uppercase font-extrabold">Stations Available</span>
                    </div>

                    <div className={`${getCardStyle()} theme-rounded p-6 flex flex-col items-center justify-center text-center`}>
                      <span className="text-[10px] font-bold uppercase text-game-muted tracking-widest mb-1">Gaming PC Availability</span>
                      <p className="text-3xl font-black text-white text-glow-secondary">
                        {crowd.pcAvailable} / {crowd.totalPc}
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1 uppercase font-extrabold">LAN Slots Available</span>
                    </div>

                    <div className={`${getCardStyle()} theme-rounded p-6 flex flex-col items-center justify-center text-center`}>
                      <span className="text-[10px] font-bold uppercase text-game-muted tracking-widest mb-1">Arena Crowd Level</span>
                      <p className={`text-2xl font-black uppercase tracking-wider ${
                        crowd.crowdLevel === 'High' ? 'text-game-danger' : crowd.crowdLevel === 'Moderate' ? 'text-game-warning' : 'text-game-success'
                      }`}>
                        {crowd.crowdLevel}
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1.5 uppercase font-extrabold">Real-time status</span>
                    </div>
                  </div>

                  {/* Popular games highlights */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-game-primary">Featured Arena Titles</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {games.slice(0, 4).map(game => (
                        <div key={game._id} className={`${getCardStyle()} theme-rounded overflow-hidden group hover:scale-[1.02] transition-all duration-200 border border-slate-800`}>
                          <div className="h-44 w-full bg-slate-900 relative">
                            <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                            <div className="absolute top-2 right-2">
                              <span className="bg-[#0B1020]/90 text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded border border-slate-800">{game.platform}</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-extrabold text-xs text-white uppercase truncate">{game.title}</h4>
                            <p className="text-[9px] text-game-muted font-bold truncate mt-0.5">{game.genre}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE AVAILABILITY */}
              {activeTab === 'availability' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Live Occupancy Tracker</h2>
                    <p className="text-xs text-game-muted">Check real-time station slot states in the lounge. Values sync automatically.</p>
                  </div>

                  {/* Dynamic Device Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {devices.map(device => (
                      <div key={device._id} className={`${getCardStyle()} theme-rounded p-5 border border-slate-800 flex flex-col justify-between h-40 hover:border-slate-700 transition-all`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-black text-white text-sm uppercase tracking-wide">{device.deviceId}</h3>
                            <p className="text-[10px] text-game-muted font-bold uppercase mt-0.5">{device.name}</p>
                          </div>
                          {getStatusBadge(device.status)}
                        </div>

                        <div className="flex items-end justify-between border-t border-slate-800/80 pt-3">
                          <div>
                            <span className="text-[8px] text-slate-500 font-extrabold uppercase">Platform Setup</span>
                            <p className="text-[11px] font-bold text-slate-200 mt-0.5">
                              {device.type === 'PS5' ? 'PlayStation 5 (4 Players)' : device.type === 'PC' ? 'PC (Keyboard+Mouse)' : 'PC (Controller)'}
                            </p>
                          </div>
                          {device.status === 'available' ? (
                            <button onClick={() => {
                              setBookingForm(prev => ({ ...prev, deviceType: device.type, deviceId: device.deviceId }));
                              setActiveTab('book');
                              setBookingStep(1);
                            }} className="bg-game-primary hover:bg-sky-600 text-white font-extrabold text-[9px] uppercase px-3 py-1 rounded">
                              Book
                            </button>
                          ) : (
                            device.status === 'occupied' && (
                              <span className="text-[9px] text-game-danger font-mono font-bold animate-pulse">In Session</span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: GAMES LIBRARY */}
              {activeTab === 'games' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-wider">Games Library</h2>
                      <p className="text-xs text-game-muted">Search and filter playable titles preloaded across our arena platforms.</p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          className="game-input text-xs pl-9 py-2 w-48 bg-slate-900"
                          placeholder="Search games..."
                          value={gameSearch}
                          onChange={e => setGameSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="game-input text-xs py-2 bg-slate-900"
                        value={gamePlatformFilter}
                        onChange={e => setGamePlatformFilter(e.target.value)}
                      >
                        <option value="All">All Platforms</option>
                        <option value="PS5">PlayStation 5</option>
                        <option value="PC">PC LAN</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {filteredGames.map(game => (
                      <div key={game._id} className={`${getCardStyle()} theme-rounded overflow-hidden border border-slate-800`}>
                        <div className="h-48 w-full bg-slate-950 relative">
                          <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 space-y-1">
                          <span className="bg-[#0B1020]/90 text-game-primary font-black text-[8px] uppercase px-2 py-0.5 rounded border border-slate-800">{game.platform}</span>
                          <h4 className="font-extrabold text-xs text-white uppercase truncate pt-1">{game.title}</h4>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold pt-1">
                            <span>{game.genre}</span>
                            <span>Max {game.maxPlayers}P</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PRICING */}
              {activeTab === 'pricing' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Dynamic Pricing Matrix</h2>
                    <p className="text-xs text-game-muted">Lounge rates are generated dynamically based on active system policies.</p>
                  </div>

                  {pricing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* PS5 pricing */}
                      <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-4`}>
                        <div className="border-b border-slate-800 pb-3">
                          <h3 className="font-black text-sm text-game-primary uppercase tracking-wider">PlayStation 5 Station</h3>
                          <p className="text-[10px] text-game-muted font-bold mt-0.5">Rates scaled by active player controllers</p>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(pricing.ps5 || {}).map(([players, rate]) => (
                            <div key={players} className="flex justify-between items-center bg-[#0B1020]/40 p-3 rounded-lg border border-slate-800/50">
                              <span className="text-xs font-bold text-slate-200">{players} {Number(players) === 1 ? 'Player Controller' : 'Player Controllers'}</span>
                              <span className="text-sm font-extrabold text-white font-mono">₹{rate as number}/hr</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PC pricing */}
                      <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-4`}>
                        <div className="border-b border-slate-800 pb-3">
                          <h3 className="font-black text-sm text-game-secondary uppercase tracking-wider">High-End PC LAN Gaming</h3>
                          <p className="text-[10px] text-game-muted font-bold mt-0.5">Flat rates for professional keyboard/controller peripherals</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-[#0B1020]/40 p-3 rounded-lg border border-slate-800/50">
                            <span className="text-xs font-bold text-slate-200">Standard Keyboard + Mouse Setup</span>
                            <span className="text-sm font-extrabold text-white font-mono">₹{pricing.pc?.keyboard_mouse}/hr</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#0B1020]/40 p-3 rounded-lg border border-slate-800/50">
                            <span className="text-xs font-bold text-slate-200">DualShock/Xbox Controller Gaming</span>
                            <span className="text-sm font-extrabold text-white font-mono">₹{pricing.pc?.controller}/hr</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-game-muted font-bold">Failed to load hourly pricing matrix.</p>
                  )}
                </div>
              )}

              {/* TAB 5: BOOK SESSION */}
              {activeTab === 'book' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider text-center">Lounge Reservation System</h2>
                    <p className="text-xs text-game-muted text-center">Frictionless guest check-in. Instant booking hex token created.</p>
                  </div>

                  <div className={`${getCardStyle()} theme-rounded p-6 md:p-8 border border-slate-800`}>
                    
                    {/* Wizard Steps Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-game-primary">
                        Step {bookingStep} of 7
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {bookingStep === 1 && 'Select Device Platform'}
                        {bookingStep === 2 && 'Select Station Device'}
                        {bookingStep === 3 && 'Pick Date & Slot'}
                        {bookingStep === 4 && 'Choose Duration'}
                        {bookingStep === 5 && 'Select Players Count'}
                        {bookingStep === 6 && 'Choose Game Title'}
                        {bookingStep === 7 && 'Confirm Booking Request'}
                      </span>
                    </div>

                    <form onSubmit={handleBookingSubmit} className="space-y-6">
                      
                      {/* STEP 1: Device Type */}
                      {bookingStep === 1 && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider">
                            Choose Platform Setup
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { type: 'PS5', name: 'PlayStation 5 Console', desc: '4 controllers supported, TV gameplay' },
                              { type: 'PC', name: 'Keyboard + Mouse LAN', desc: 'ROG setups, competitive peripherals' },
                              { type: 'PC_Controller', name: 'PC with Controller', desc: 'ROG setups, handheld gameplay feel' }
                            ].map(item => (
                              <button
                                type="button"
                                key={item.type}
                                onClick={() => setBookingForm({ ...bookingForm, deviceType: item.type as any })}
                                className={`p-4 border rounded-xl flex flex-col justify-between h-28 text-left transition-all ${
                                  bookingForm.deviceType === item.type 
                                    ? 'border-game-primary bg-game-primary/10 shadow-neon-primary' 
                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                                }`}
                              >
                                <span className="font-extrabold text-xs text-white uppercase">{item.name}</span>
                                <span className="text-[9px] text-game-muted mt-1">{item.desc}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-end pt-4">
                            <button type="button" onClick={() => setBookingStep(2)} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: Device Selection */}
                      {bookingStep === 2 && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider">
                            Choose Active Station
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {devices.filter(d => d.type === bookingForm.deviceType).map(device => {
                              const isAvailable = device.status === 'available';
                              return (
                                <button
                                  type="button"
                                  key={device._id}
                                  disabled={!isAvailable}
                                  onClick={() => setBookingForm({ ...bookingForm, deviceId: device.deviceId })}
                                  className={`p-3 border rounded-lg text-left transition-all flex justify-between items-center ${
                                    bookingForm.deviceId === device.deviceId
                                      ? 'border-game-primary bg-game-primary/10 shadow-neon-primary'
                                      : !isAvailable
                                        ? 'opacity-40 border-slate-900 bg-transparent cursor-not-allowed'
                                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                                  }`}
                                >
                                  <div>
                                    <span className="font-extrabold text-xs text-white uppercase block">{device.deviceId}</span>
                                    <span className="text-[9px] text-slate-500 truncate block mt-0.5">{device.name}</span>
                                  </div>
                                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${
                                    isAvailable ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                                  }`}>
                                    {device.status}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(1)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="button" onClick={() => setBookingStep(3)} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Date & Slot */}
                      {bookingStep === 3 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider mb-1">Select Date</label>
                              <input
                                type="date"
                                required
                                className="w-full game-input text-sm py-2 bg-slate-900"
                                value={bookingForm.date}
                                onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider mb-1">Select Start Time</label>
                              <select
                                className="w-full game-input text-sm py-2 bg-slate-900"
                                value={bookingForm.startTime}
                                onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                              >
                                {[
                                  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
                                  '15:00', '15:50', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
                                  '20:00', '20:30', '21:00', '21:30', '22:00'
                                ].map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(2)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="button" onClick={() => setBookingStep(4)} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Duration */}
                      {bookingStep === 4 && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider">
                            Choose Session Duration
                          </label>
                          <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(hr => (
                              <button
                                type="button"
                                key={hr}
                                onClick={() => setBookingForm({ ...bookingForm, duration: hr })}
                                className={`p-4 border rounded-xl flex flex-col items-center justify-center h-20 text-center transition-all ${
                                  bookingForm.duration === hr
                                    ? 'border-game-primary bg-game-primary/10 shadow-neon-primary'
                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                                }`}
                              >
                                <span className="font-extrabold text-sm text-white uppercase">{hr} Hour{hr > 1 ? 's' : ''}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(3)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="button" onClick={() => setBookingStep(5)} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 5: Players Count */}
                      {bookingStep === 5 && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider">
                            Select Number of Active Players
                          </label>
                          {bookingForm.deviceType === 'PS5' ? (
                            <div className="grid grid-cols-4 gap-3">
                              {[1, 2, 3, 4].map(p => (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => setBookingForm({ ...bookingForm, playersCount: p })}
                                  className={`p-3 border rounded-lg text-center transition-all ${
                                    bookingForm.playersCount === p
                                      ? 'border-game-primary bg-game-primary/10 shadow-neon-primary'
                                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs text-white uppercase block">{p} P</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-[#0B1020]/50 border border-slate-800 rounded-lg text-center">
                              <p className="text-xs text-game-muted font-bold">LAN PCs are individual setups. 1 Player maximum supported.</p>
                            </div>
                          )}
                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(4)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="button" onClick={() => {
                              setBookingForm(prev => ({ ...prev, playersCount: prev.deviceType === 'PS5' ? prev.playersCount : 1 }));
                              setBookingStep(6);
                            }} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 6: Game Title */}
                      {bookingStep === 6 && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-game-muted uppercase tracking-wider mb-1">
                            Choose Title to Play
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                            {games.filter(g => bookingForm.deviceType === 'PS5' ? g.platform.includes('PS5') : g.platform.includes('PC')).map(game => (
                              <button
                                type="button"
                                key={game._id}
                                onClick={() => setBookingForm({ ...bookingForm, gameName: game.title })}
                                className={`p-3 border rounded-lg text-left transition-all flex items-center gap-3 ${
                                  bookingForm.gameName === game.title
                                    ? 'border-game-primary bg-game-primary/10 shadow-neon-primary'
                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                                }`}
                              >
                                <img src={game.imageUrl} alt={game.title} className="w-10 h-10 object-cover rounded" />
                                <div>
                                  <span className="font-extrabold text-xs text-white uppercase block">{game.title}</span>
                                  <span className="text-[9px] text-game-muted font-bold uppercase">{game.genre}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(5)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="button" onClick={() => setBookingStep(7)} className="btn-primary py-2 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              Next
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 7: Customer details / summary */}
                      {bookingStep === 7 && (
                        <div className="space-y-5">
                          {bookingError && (
                            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs font-bold rounded-lg uppercase tracking-wide">
                              ⚠️ {bookingError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                                Full Name *
                              </label>
                              <input
                                type="text"
                                required
                                className="w-full game-input text-sm py-2 bg-slate-900"
                                value={bookingForm.customerName}
                                onChange={e => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                                placeholder="Rahul Sharma"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                                Contact Mobile Number *
                              </label>
                              <input
                                type="text"
                                required
                                className="w-full game-input text-sm py-2 bg-slate-900"
                                value={bookingForm.phoneNumber}
                                onChange={e => setBookingForm({ ...bookingForm, phoneNumber: e.target.value })}
                                placeholder="9876543210"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">
                              Notes / Preferences
                            </label>
                            <textarea
                              rows={2}
                              className="w-full game-input text-sm py-2 resize-none bg-slate-900"
                              value={bookingForm.notes}
                              onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                              placeholder="Prefer specific controller setup or controller side..."
                            />
                          </div>

                          {/* Summary Card */}
                          <div className="bg-[#0B1020]/60 border border-slate-800 p-4 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-black text-game-primary uppercase tracking-widest border-b border-slate-800/80 pb-1.5">Booking Estimate Receipt</h4>
                            <div className="grid grid-cols-2 gap-y-2 text-xs font-bold">
                              <div className="text-slate-500 uppercase text-[10px]">Station Device:</div>
                              <div className="text-white uppercase font-black text-right">{bookingForm.deviceId}</div>
                              
                              <div className="text-slate-500 uppercase text-[10px]">Date / Time Slot:</div>
                              <div className="text-white text-right">{bookingForm.date} @ {bookingForm.startTime} ({bookingForm.duration} hr)</div>
                              
                              <div className="text-slate-500 uppercase text-[10px]">Players / Game:</div>
                              <div className="text-white text-right">{bookingForm.playersCount}P / {bookingForm.gameName || 'General Gaming'}</div>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-800/80 pt-3">
                              <span className="text-xs font-black uppercase text-game-success tracking-wider">Total Amount Due</span>
                              <span className="text-xl font-black text-white font-mono">₹{calculateTotalAmount()}</span>
                            </div>
                          </div>

                          <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button type="button" onClick={() => setBookingStep(6)} className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <ArrowLeft className="w-3.5 h-3.5" />
                              Back
                            </button>
                            <button type="submit" disabled={isBookingSubmitting} className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                              {isBookingSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                              ) : (
                                <>
                                  Confirm Reservation
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 8 (GUEST BOOKING SUCCESS SCREEN) */}
              {activeTab === 'book' && bookingStep === 8 && confirmedBooking && (
                <div className="max-w-md mx-auto space-y-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <CheckCircle className="w-12 h-12 text-game-success animate-bounce mt-2" />
                    <h2 className="text-xl font-bold uppercase text-white tracking-wider">Booking Confirmed!</h2>
                    <p className="text-xs text-game-muted max-w-sm leading-relaxed">
                      Your booking request was generated successfully. Please present the QR code at the reception desk for check-in.
                    </p>
                  </div>

                  <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-5 flex flex-col items-center justify-center`}>
                    {/* Booking Hex ID */}
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Booking ID</span>
                      <p className="text-2xl font-black text-white font-mono tracking-wider">{confirmedBooking.bookingId}</p>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${confirmedBooking.bookingId}`} 
                        alt="QR Checkin"
                        className="w-36 h-36"
                      />
                    </div>

                    {/* Detail block */}
                    <div className="w-full text-left bg-[#0B1020]/50 p-4 border border-slate-800 rounded-lg space-y-2 text-xs font-bold">
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[9px]">Station:</span>
                        <span className="text-white uppercase font-black">{confirmedBooking.deviceId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[9px]">Slot Time:</span>
                        <span className="text-white font-black">{confirmedBooking.date} @ {confirmedBooking.timeSlot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[9px]">Amount Rate:</span>
                        <span className="text-white font-black font-mono">₹{confirmedBooking.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[9px]">Current Status:</span>
                        <span className="text-game-warning font-black uppercase text-[10px]">{confirmedBooking.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center justify-center">
                    <button onClick={() => {
                      setTrackId(confirmedBooking.bookingId);
                      setTrackPhone(confirmedBooking.customerPhone);
                      setActiveTab('track');
                      setTrackedBooking(confirmedBooking);
                    }} className="btn-secondary py-2 px-6 font-bold uppercase text-xs tracking-wider">
                      Track Status
                    </button>
                    <button onClick={() => setActiveTab('home')} className="btn-primary py-2 px-6 font-bold uppercase text-xs tracking-wider">
                      Return Home
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: TRACK BOOKING */}
              {activeTab === 'track' && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Track Reservation Status</h2>
                    <p className="text-xs text-game-muted">Enter booking token credentials to check active queue details.</p>
                  </div>

                  {/* Tracking Search Form */}
                  <div className={`${getCardStyle()} theme-rounded p-5 border border-slate-800`}>
                    <form onSubmit={handleTrackBooking} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">Booking ID *</label>
                        <input
                          type="text"
                          required
                          className="w-full game-input text-sm py-2 bg-slate-900 font-mono text-center uppercase"
                          placeholder="e.g. BK-7F4D2A"
                          value={trackId}
                          onChange={e => setTrackId(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-game-muted uppercase mb-1">Mobile Phone Number *</label>
                        <input
                          type="text"
                          required
                          className="w-full game-input text-sm py-2 bg-slate-900 text-center"
                          placeholder="e.g. 9876543210"
                          value={trackPhone}
                          onChange={e => setTrackPhone(e.target.value)}
                        />
                      </div>

                      {trackingError && (
                        <p className="text-xs text-game-danger font-bold text-center uppercase tracking-wide">
                          ⚠️ {trackingError}
                        </p>
                      )}

                      <button type="submit" disabled={isTrackingLoading} className="w-full btn-primary py-2.5 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2">
                        {isTrackingLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Search Reservation'}
                      </button>
                    </form>
                  </div>

                  {/* Tracked booking result block */}
                  {trackedBooking && (
                    <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-4 flex flex-col items-center`}>
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Reservation Status</span>
                      <span className={`px-4 py-1.5 rounded-full font-black text-xs uppercase ${
                        trackedBooking.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        trackedBooking.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        trackedBooking.status === 'cancelled' ? 'bg-red-950 text-red-400 border border-red-800' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {trackedBooking.status}
                      </span>

                      {/* Display QR again for confirmed bookings */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${trackedBooking.bookingId}`} 
                          alt="QR Tracked Checkin"
                          className="w-24 h-24"
                        />
                      </div>

                      <div className="w-full text-left bg-[#0B1020]/50 p-4 border border-slate-800 rounded-lg space-y-2 text-xs font-bold mt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Booking ID:</span>
                          <span className="text-white font-mono uppercase font-black">{trackedBooking.bookingId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Customer Name:</span>
                          <span className="text-white">{trackedBooking.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Station:</span>
                          <span className="text-white uppercase font-black">{trackedBooking.deviceId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Time Slot:</span>
                          <span className="text-white font-black">{trackedBooking.date} @ {trackedBooking.timeSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Total Duration:</span>
                          <span className="text-white">{trackedBooking.duration} mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase text-[9px]">Rate Bill Amount:</span>
                          <span className="text-white font-black font-mono">₹{trackedBooking.amount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: CONTACT & WORKING HOURS */}
              {activeTab === 'contact' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Contact & Address</h2>
                    <p className="text-xs text-game-muted">Find our physical arena lounge directions, hours of operation, and social handles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Info Card */}
                    <div className="space-y-6">
                      <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-4`}>
                        <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-game-primary" />
                          Lounge Coordinates
                        </h3>

                        <div className="space-y-3 text-xs font-bold leading-relaxed">
                          <div>
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Lounge Address</span>
                            <p className="text-slate-200 mt-0.5">{cafeInfo?.address || 'Shop No. 12, Ground Floor, Cyber Plaza, Sector V, Salt Lake, Kolkata'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Email Support</span>
                            <p className="text-slate-200 mt-0.5">{cafeInfo?.email || 'contact@gamehub.com'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Direct Hotline</span>
                            <p className="text-slate-200 mt-0.5">{cafeInfo?.phone || '+91 98765 43210'}</p>
                          </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="flex gap-3 pt-2">
                          {cafeInfo?.whatsapp && (
                            <a 
                              href={`https://wa.me/${cafeInfo.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-4 py-2 rounded-lg text-xs font-bold uppercase transition hover:brightness-110"
                            >
                              <MessageSquare className="w-4 h-4" />
                              WhatsApp Chat
                            </a>
                          )}
                          {cafeInfo?.instagram && (
                            <a 
                              href={`https://instagram.com/${cafeInfo.instagram}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1.5 bg-pink-950 text-pink-400 border border-pink-800/80 px-4 py-2 rounded-lg text-xs font-bold uppercase transition hover:brightness-110"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Map iframe placeholder or navigation link */}
                      {cafeInfo?.googleMapsUrl && (
                        <div className={`${getCardStyle()} theme-rounded p-5 border border-slate-800 text-center`}>
                          <a 
                            href={cafeInfo.googleMapsUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-primary py-2.5 px-6 font-bold uppercase text-xs tracking-wider inline-flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            Get Directions on Google Maps
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Hours Card */}
                    <div className={`${getCardStyle()} theme-rounded p-6 border border-slate-800 space-y-4`}>
                      <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-game-secondary" />
                        Arena Gaming Hours
                      </h3>
                      <div className="space-y-2">
                        {cafeInfo?.workingHours && Object.entries(cafeInfo.workingHours).map(([day, times]: any) => (
                          <div key={day} className="flex justify-between items-center py-2 border-b border-slate-800/60 last:border-0 text-xs font-bold uppercase">
                            <span className="text-slate-400 capitalize">{day}</span>
                            <span className="text-white font-mono">{times.open} - {times.close}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Footer / Mobile Bottom Nav Navigation */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B1020]/95 border-t border-slate-800/80 backdrop-blur-md z-40 flex items-center justify-around px-2">
        {[
          { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
          { id: 'availability', label: 'Lounge', icon: <Activity className="w-5 h-5" /> },
          { id: 'games', label: 'Games', icon: <Gamepad2 className="w-5 h-5" /> },
          { id: 'pricing', label: 'Pricing', icon: <IndianRupee className="w-5 h-5" /> },
          { id: 'book', label: 'Book', icon: <Calendar className="w-5 h-5 text-glow-primary" /> },
          { id: 'track', label: 'Track', icon: <Calendar className="w-5 h-5 text-purple-400" /> }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as any);
              if (item.id === 'book') setBookingStep(1);
            }}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
              activeTab === item.id ? 'text-game-primary' : 'text-game-muted'
            }`}
          >
            {item.icon}
            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">{item.label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};
