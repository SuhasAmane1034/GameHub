import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export interface ThemeConfig {
  themeMode: 'dark' | 'light' | 'system';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: 'Inter' | 'Poppins' | 'Outfit' | 'Sora' | 'Space Grotesk';
  borderRadius: 'small' | 'medium' | 'large' | 'extra-large';
  cardStyle: 'rounded' | 'sharp' | 'glass' | 'elevated';
  animationLevel: 'off' | 'minimal' | 'normal' | 'premium';
  sidebarStyle: 'compact' | 'expanded' | 'floating' | 'glass';
  dashboardLayout: 'default' | 'modern' | 'gaming' | 'minimal';
  backgroundStyle: 'solid' | 'glassmorphism' | 'gradient' | 'neon' | 'rgb';
  logo: string;
  brandName: string;
}

export interface CafeConfig {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  googleMapsUrl: string;
  logoUrl: string;
  enableGst: boolean;
  gstRate: number;
  workingHours: any;
}

interface ThemeState {
  theme: ThemeConfig;
  cafeInfo: CafeConfig | null;
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;
  fetchThemeSettings: (cafeId?: string) => Promise<void>;
  applyTheme: (theme: ThemeConfig) => void;
  initSocket: (cafeId?: string) => void;
}

const defaultTheme: ThemeConfig = {
  themeMode: 'dark',
  primaryColor: '#5B8CFF',
  secondaryColor: '#8B5CF6',
  fontFamily: 'Inter',
  borderRadius: 'large',
  cardStyle: 'glass',
  animationLevel: 'premium',
  sidebarStyle: 'floating',
  dashboardLayout: 'gaming',
  backgroundStyle: 'gradient',
  logo: '',
  brandName: 'GameHub'
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: defaultTheme,
  cafeInfo: null,
  isLoading: false,
  error: null,
  socket: null,

  fetchThemeSettings: async (cafeId = 'default-cafe') => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/public/settings?cafeId=${cafeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settings');

      const loadedTheme = { ...defaultTheme, ...data.themeSettings };
      set({
        theme: loadedTheme,
        cafeInfo: data.cafeInfo || null,
        isLoading: false,
        error: null
      });

      // Apply styling changes immediately
      get().applyTheme(loadedTheme);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      get().applyTheme(get().theme);
    }
  },

  applyTheme: (theme: ThemeConfig) => {
    const root = document.documentElement;

    // 1. Set Colors based on Theme Mode (Light vs Dark/System)
    const isDark = theme.themeMode === 'dark' || theme.themeMode === 'system';
    
    const bgColor = isDark ? '#0B1020' : '#F8FAFC';
    const cardColor = isDark ? '#141B34' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const mutedColor = isDark ? '#94A3B8' : '#64748B';

    root.style.setProperty('--color-game-bg', bgColor);
    root.style.setProperty('--color-game-card', cardColor);
    root.style.setProperty('--color-game-text', textColor);
    root.style.setProperty('--color-game-muted', mutedColor);
    root.style.setProperty('--color-game-primary', theme.primaryColor || '#5B8CFF');
    root.style.setProperty('--color-game-secondary', theme.secondaryColor || '#8B5CF6');

    // Dynamic border color configurations
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const borderRgb = isDark ? '30, 41, 59' : '226, 232, 240';
    const borderDarkColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
    
    root.style.setProperty('--color-game-border', borderColor);
    root.style.setProperty('--color-game-border-rgb', borderRgb);
    root.style.setProperty('--color-game-border-dark', borderDarkColor);

    // RGB parsing helper to set RGB variable values for alpha modifier opacity colors
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_: string, r: string, g: string, b: string) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const primaryRgb = hexToRgb(theme.primaryColor || '#5B8CFF');
    const secondaryRgb = hexToRgb(theme.secondaryColor || '#8B5CF6');
    const bgRgb = hexToRgb(bgColor);
    const cardRgb = hexToRgb(cardColor);

    if (primaryRgb) root.style.setProperty('--color-game-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    if (secondaryRgb) root.style.setProperty('--color-game-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
    if (bgRgb) root.style.setProperty('--color-game-bg-rgb', `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`);
    if (cardRgb) root.style.setProperty('--color-game-card-rgb', `${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}`);

    // 2. Set Border Radius Mapping
    const radiusMap = {
      'small': '4px',
      'medium': '8px',
      'large': '16px',
      'extra-large': '24px'
    };
    root.style.setProperty('--theme-border-radius', radiusMap[theme.borderRadius] || '16px');

    // 3. Set Font Family Variable
    root.style.setProperty('--font-family', `'${theme.fontFamily}', sans-serif`);

    // 4. Set Animation Level Speed & Toggle Factors
    const animationMap = {
      'off': '0',
      'minimal': '0.5',
      'normal': '1',
      'premium': '1.5'
    };
    root.style.setProperty('--animation-intensity-factor', animationMap[theme.animationLevel] || '1');
  },

  initSocket: (cafeId = 'default-cafe') => {
    // Prevent duplicate connections
    if (get().socket) return;

    console.log('🔌 Connecting to theme socket sync...');
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('📡 Socket connection established for theme updates');
    });

    // When admin updates theme or general settings, reload theme
    socket.on('settings_updated', () => {
      console.log('🔄 Settings updated by Admin. Refreshing theme configurations...');
      get().fetchThemeSettings(cafeId);
    });

    socket.on('theme_updated', () => {
      console.log('🎨 Theme updated by Admin. Refreshing theme styling...');
      get().fetchThemeSettings(cafeId);
    });

    set({ socket });
  }
}));
