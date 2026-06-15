import mongoose from 'mongoose';
import { createDataModel } from '../db/db.js';

// ==========================================
// 1. User Model
// ==========================================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const User = createDataModel('User', userSchema, [
  {
    _id: 'user-admin-seed',
    name: 'Admin User',
    email: 'admin@gamehub.com',
    password: '$2a$10$OYM2kdC6pIppsPaEjQhFROWqJ3zDEPjeP5FzzoW2N1R8JhZ/5Zb7a', // admin123
    role: 'admin',
    cafeId: 'default-cafe',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'user-staff-seed',
    name: 'Staff Member',
    email: 'staff@gamehub.com',
    password: '$2a$10$gc95Z079MdKPu9aKC9SmsuC0Ofn7bUCvZLo3wCJbW2UY4g2y6FRO.', // staff123
    role: 'staff',
    cafeId: 'default-cafe',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

// ==========================================
// 2. Device Model
// ==========================================
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['PS5', 'PC', 'PC_Controller'], required: true },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' },
  currentCustomer: { type: String, default: '' },
  activeSessionId: { type: String, default: '' },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Device = createDataModel('Device', deviceSchema, [
  { _id: 'dev-01', deviceId: 'PS5-01', name: 'PlayStation 5 Neon Blue', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-02', deviceId: 'PS5-02', name: 'PlayStation 5 Cyber Punk', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-03', deviceId: 'PS5-03', name: 'PlayStation 5 Liquid Neon', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-04', deviceId: 'PC-01', name: 'Asus ROG Gaming PC 01', type: 'PC', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-05', deviceId: 'PC-02', name: 'Asus ROG Gaming PC 02', type: 'PC', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-06', deviceId: 'PC-03', name: 'Razer Blade Controller PC 03', type: 'PC_Controller', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' },
  { _id: 'dev-07', deviceId: 'PC-04', name: 'Razer Blade Controller PC 04', type: 'PC_Controller', status: 'available', currentCustomer: '', activeSessionId: '', cafeId: 'default-cafe' }
]);

// ==========================================
// 3. Session Model
// ==========================================
const sessionSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deviceId: { type: String, required: true },
  playersCount: { type: Number, required: true, default: 1 },
  gameName: { type: String, default: 'General Gaming' },
  duration: { type: Number, required: true }, // in minutes, or -1 for unlimited
  startTime: { type: String, required: true }, // ISO String
  endTime: { type: String, default: '' }, // ISO String, empty if active/unlimited
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  pricingRate: { type: Number, required: true }, // rate per hour at start time
  totalAmount: { type: Number, default: 0 },
  cafeId: { type: String, default: 'default-cafe' },
  pauseLogs: [{
    pausedAt: { type: String },
    resumedAt: { type: String },
    elapsedBeforePause: { type: Number } // seconds
  }],
  extensionLogs: [{
    extendedAt: { type: String },
    additionalMinutes: { type: Number }
  }],
}, { timestamps: true });

export const Session = createDataModel('Session', sessionSchema);

// ==========================================
// 4. Booking Model
// ==========================================
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true }, // Hex: e.g. BK-7F4D2A
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true }, // Keep field name for compatibility, maps to phoneNumber
  deviceId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true }, // HH:MM
  timeSlot: { type: String, required: true }, // e.g. "14:00 - 16:00"
  duration: { type: Number, required: true }, // in minutes
  amount: { type: Number, required: true }, // Total booking amount
  notes: { type: String, default: '' },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled', 'completed'], default: 'pending' },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Booking = createDataModel('Booking', bookingSchema);

// ==========================================
// 5. Invoice Model
// ==========================================
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deviceId: { type: String, required: true },
  playersCount: { type: Number, default: 1 },
  duration: { type: Number, required: true }, // in minutes
  pricingRate: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 }, // GST
  totalAmount: { type: Number, required: true },
  date: { type: String, required: true }, // ISO String
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Invoice = createDataModel('Invoice', invoiceSchema);

// ==========================================
// 6. Setting Model
// ==========================================
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Setting = createDataModel('Setting', settingSchema, [
  {
    _id: 'set-info',
    key: 'cafe_info',
    cafeId: 'default-cafe',
    value: {
      name: 'GameHub Cafe',
      tagline: 'Your Ultimate Gaming Destination',
      address: 'Shop No. 12, Ground Floor, Cyber Plaza, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
      phone: '9876543210',
      whatsapp: '9876543210',
      email: 'contact@gamehub.com',
      instagram: 'gamehub_cafe',
      googleMapsUrl: 'https://maps.google.com',
      gstNumber: '19AAACG0123A1Z2',
      logoUrl: '',
      enableGst: true,
      gstRate: 18,
      workingHours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '23:59' },
        saturday: { open: '09:00', close: '23:59' },
        sunday: { open: '09:00', close: '23:59' }
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'set-pricing',
    key: 'pricing',
    cafeId: 'default-cafe',
    value: {
      ps5: {
        '1': 100, // 1 player = ₹100/hr
        '2': 150, // 2 players = ₹150/hr
        '3': 200, // 3 players = ₹200/hr
        '4': 250  // 4 players = ₹250/hr
      },
      pc: {
        keyboard_mouse: 80, // Keyboard & mouse = ₹80/hr
        controller: 100    // Controller Gaming = ₹100/hr
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

// ==========================================
// 7. ThemeSettings Model
interface IThemeSettings {
  _id?: string;
  cafeId: string;
  themeMode: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  cardStyle: string;
  animationLevel: string;
  sidebarStyle: string;
  dashboardLayout: string;
  backgroundStyle: string;
  logo: string;
  brandName: string;
  createdAt?: string;
  updatedAt?: string;
}

interface IGame {
  _id?: string;
  title: string;
  genre: string;
  platform: string;
  maxPlayers: number;
  imageUrl: string;
  cafeId: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 7. ThemeSettings Model
// ==========================================
const themeSettingsSchema = new mongoose.Schema({
  cafeId: { type: String, required: true, unique: true, default: 'default-cafe' },
  themeMode: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  primaryColor: { type: String, default: '#5B8CFF' },
  secondaryColor: { type: String, default: '#8B5CF6' },
  fontFamily: { type: String, enum: ['Inter', 'Poppins', 'Outfit', 'Sora', 'Space Grotesk'], default: 'Inter' },
  borderRadius: { type: String, enum: ['small', 'medium', 'large', 'extra-large'], default: 'large' },
  cardStyle: { type: String, enum: ['rounded', 'sharp', 'glass', 'elevated'], default: 'glass' },
  animationLevel: { type: String, enum: ['off', 'minimal', 'normal', 'premium'], default: 'premium' },
  sidebarStyle: { type: String, enum: ['compact', 'expanded', 'floating', 'glass'], default: 'floating' },
  dashboardLayout: { type: String, enum: ['default', 'modern', 'gaming', 'minimal'], default: 'gaming' },
  backgroundStyle: { type: String, enum: ['solid', 'glassmorphism', 'gradient', 'neon', 'rgb'], default: 'gradient' },
  logo: { type: String, default: '' },
  brandName: { type: String, default: 'GameHub' }
}, { timestamps: true });

export const ThemeSettings = createDataModel<IThemeSettings>('ThemeSettings', themeSettingsSchema, [
  {
    _id: 'theme-default',
    cafeId: 'default-cafe',
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
    brandName: 'GameHub',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

// ==========================================
// 8. Game Model
// ==========================================
const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  genre: { type: String, required: true },
  platform: { type: String, required: true },
  maxPlayers: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Game = createDataModel<IGame>('Game', gameSchema, [
  { title: 'FC 26', genre: 'Sports', platform: 'PS5', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'GTA VI', genre: 'Action-Adventure', platform: 'PS5 / PC', maxPlayers: 1, imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'Tekken 8', genre: 'Fighting', platform: 'PS5', maxPlayers: 2, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'Valorant', genre: 'FPS / Tactical Shooter', platform: 'PC', maxPlayers: 5, imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'BGMI', genre: 'Battle Royale', platform: 'Mobile / PC Emulator', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'WWE 2K26', genre: 'Sports / Wrestling', platform: 'PS5', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'Minecraft', genre: 'Sandbox / Survival', platform: 'PC', maxPlayers: 10, imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
  { title: 'Call of Duty', genre: 'FPS / Action', platform: 'PS5 / PC', maxPlayers: 12, imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' }
]);

// ==========================================
// 9. Customer Model
// ==========================================
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String, default: '' },
  lastVisit: { type: String, default: '' },
  totalVisits: { type: Number, default: 0 },
  cafeId: { type: String, default: 'default-cafe' }
}, { timestamps: true });

export const Customer = createDataModel('Customer', customerSchema);
