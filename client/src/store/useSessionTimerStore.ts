import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface PauseLog {
  pausedAt: string;
  resumedAt: string;
  elapsedBeforePause: number;
}

export interface ExtensionLog {
  extendedAt: string;
  additionalMinutes: number;
}

export interface Session {
  _id: string;
  customerName: string;
  customerPhone: string;
  deviceId: string;
  playersCount: number;
  gameName: string;
  duration: number; // in minutes, -1 for unlimited
  startTime: string; // ISO String
  endTime?: string;
  status: 'active' | 'paused' | 'completed';
  pricingRate: number;
  totalAmount: number;
  pauseLogs: PauseLog[];
  extensionLogs: ExtensionLog[];
  // Added on the client side for rendering
  liveElapsedSeconds?: number;
  liveRemainingSeconds?: number;
  liveCost?: number;
}

export interface ToastAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: Date;
}

interface SessionTimerState {
  sessions: Session[];
  toasts: ToastAlert[];
  isLoading: boolean;
  error: string | null;
  tickerIntervalId: any | null;
  addToast: (message: string, type: ToastAlert['type']) => void;
  removeToast: (id: string) => void;
  fetchSessions: () => Promise<void>;
  startSession: (data: {
    customerName: string;
    customerPhone: string;
    deviceId: string;
    playersCount: number;
    gameName: string;
    duration: number;
    pricingRate: number;
  }) => Promise<boolean>;
  pauseSession: (id: string) => Promise<void>;
  resumeSession: (id: string) => Promise<void>;
  extendSession: (id: string, additionalMinutes: number) => Promise<void>;
  endSession: (id: string) => Promise<any | null>;
  startTicker: () => void;
  stopTicker: () => void;
}

export const useSessionTimerStore = create<SessionTimerState>((set, get) => ({
  sessions: [],
  toasts: [],
  isLoading: false,
  error: null,
  tickerIntervalId: null,

  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set(state => ({
      toasts: [...state.toasts, { id, message, type, timestamp: new Date() }].slice(-5) // Limit to last 5
    }));
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  },

  fetchSessions: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch sessions');

      set({
        sessions: data.map((s: Session) => ({ ...s, liveElapsedSeconds: 0, liveRemainingSeconds: 0, liveCost: 0 })),
        isLoading: false
      });
      
      // Update calculations immediately
      get().startTicker();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  startSession: async (formData) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start session');

      set(state => ({
        sessions: [...state.sessions, { ...data, liveElapsedSeconds: 0, liveRemainingSeconds: 0, liveCost: 0 }],
        isLoading: false
      }));

      get().addToast(`Session started for ${formData.customerName} on ${formData.deviceId}`, 'success');
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      get().addToast(err.message, 'danger');
      return false;
    }
  },

  pauseSession: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/sessions/${id}/pause`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      set(state => ({
        sessions: state.sessions.map(s => s._id === id ? { ...s, ...data } : s)
      }));

      get().addToast(`Session paused for ${data.customerName}`, 'info');
    } catch (err: any) {
      get().addToast(err.message, 'danger');
    }
  },

  resumeSession: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/sessions/${id}/resume`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      set(state => ({
        sessions: state.sessions.map(s => s._id === id ? { ...s, ...data } : s)
      }));

      get().addToast(`Session resumed for ${data.customerName}`, 'success');
    } catch (err: any) {
      get().addToast(err.message, 'danger');
    }
  },

  extendSession: async (id, additionalMinutes) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/sessions/${id}/extend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ additionalMinutes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      set(state => ({
        sessions: state.sessions.map(s => s._id === id ? { ...s, ...data } : s)
      }));

      get().addToast(`Session extended by ${additionalMinutes}m for ${data.customerName}`, 'success');
    } catch (err: any) {
      get().addToast(err.message, 'danger');
    }
  },

  endSession: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const res = await fetch(`${API_URL}/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Remove from list or mark completed
      set(state => ({
        sessions: state.sessions.filter(s => s._id !== id)
      }));

      get().addToast(`Session ended for ${data.session.customerName}. Bill generated!`, 'success');
      return data.invoice;
    } catch (err: any) {
      get().addToast(err.message, 'danger');
      return null;
    }
  },

  startTicker: () => {
    const existing = get().tickerIntervalId;
    if (existing) clearInterval(existing);

    const intervalId = setInterval(() => {
      const { sessions, addToast } = get();
      const now = new Date().getTime();
      let updated = false;

      const updatedSessions = sessions.map(session => {
        if (session.status === 'completed') return session;

        // Calculate live elapsed seconds
        const start = new Date(session.startTime).getTime();
        const rawElapsed = Math.max(0, (now - start) / 1000);

        // Sum paused times
        let pausedSeconds = 0;
        if (session.pauseLogs && session.pauseLogs.length > 0) {
          for (const log of session.pauseLogs) {
            const pStart = new Date(log.pausedAt).getTime();
            const pEnd = log.resumedAt ? new Date(log.resumedAt).getTime() : now;
            pausedSeconds += Math.max(0, (pEnd - pStart) / 1000);
          }
        }

        const activeSeconds = Math.max(0, Math.round(rawElapsed - pausedSeconds));
        const activeMinutes = Math.max(1, Math.round(activeSeconds / 60));

        // Pricing logic
        let billableMinutes = activeMinutes;
        if (session.duration > 0 && activeMinutes < session.duration) {
          billableMinutes = session.duration; // Flat lock-in rate
        }
        
        const ratePerMinute = session.pricingRate / 60;
        const liveCost = Math.round(billableMinutes * ratePerMinute);

        // Timer outputs
        let remainingSeconds = 0;
        if (session.duration > 0) {
          const totalDurationSeconds = session.duration * 60;
          remainingSeconds = Math.max(0, totalDurationSeconds - activeSeconds);

          // Alert at exactly 10 minutes (600s) left, with a flag to avoid multiple spam
          if (session.status === 'active' && remainingSeconds === 600) {
            addToast(`Session ending in 10 minutes for ${session.customerName} on ${session.deviceId}`, 'warning');
          }
          // Alert when time is up
          if (session.status === 'active' && remainingSeconds === 0) {
            addToast(`Time completed for ${session.customerName} on ${session.deviceId}!`, 'danger');
          }
        }

        if (
          session.liveElapsedSeconds !== activeSeconds ||
          session.liveRemainingSeconds !== remainingSeconds ||
          session.liveCost !== liveCost
        ) {
          updated = true;
          return {
            ...session,
            liveElapsedSeconds: activeSeconds,
            liveRemainingSeconds: remainingSeconds,
            liveCost
          };
        }

        return session;
      });

      if (updated) {
        set({ sessions: updatedSessions });
      }
    }, 1000);

    set({ tickerIntervalId: intervalId });
  },

  stopTicker: () => {
    const id = get().tickerIntervalId;
    if (id) {
      clearInterval(id);
      set({ tickerIntervalId: null });
    }
  }
}));
