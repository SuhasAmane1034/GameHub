import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface CafeInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  googleMapsUrl: string;
  logoUrl: string;
  gstNumber: string;
  enableGst: boolean;
  gstRate: number;
  workingHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
}

export interface Pricing {
  ps5: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
  };
  pc: {
    keyboard_mouse: number;
    controller: number;
  };
}

export interface ThemeSettingsConfig {
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

interface SettingsState {
  cafeInfo: CafeInfo | null;
  pricing: Pricing | null;
  themeSettings: ThemeSettingsConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateCafeInfo: (info: CafeInfo) => Promise<boolean>;
  updatePricing: (pricing: Pricing) => Promise<boolean>;
  updateAppearance: (appearance: ThemeSettingsConfig) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cafeInfo: null,
  pricing: null,
  themeSettings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settings');

      set({
        cafeInfo: data.cafeInfo,
        pricing: data.pricing,
        themeSettings: data.themeSettings,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateCafeInfo: async (info) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/settings/cafe`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update cafe info');

      set({ cafeInfo: data.value, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  updatePricing: async (pricing) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/settings/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(pricing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update pricing');

      set({ pricing: data.value, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  updateAppearance: async (appearance) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/settings/appearance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(appearance),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update appearance theme');

      set({ themeSettings: data.value, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
