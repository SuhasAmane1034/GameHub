import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase } from './db/db.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import sessionRoutes from './routes/sessions.js';
import bookingRoutes from './routes/bookings.js';
import customerRoutes from './routes/customers.js';
import billingRoutes from './routes/billing.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import publicRoutes from './routes/public.js'; // client portal public endpoints
import { Invoice, Booking, User, Device, Setting, ThemeSettings, Game } from './models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
console.log(`🔍 Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully. Keys found:', Object.keys(result.parsed || {}));
  console.log('Raw MONGODB_URI in process.env:', process.env.MONGODB_URI);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')) 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes('*')) {
    return true;
  }
  const cleanOrigin = origin.trim().replace(/\/$/, '');
  return (
    allowedOrigins.includes(cleanOrigin) || 
    cleanOrigin.startsWith('http://localhost:') ||
    /\.vercel\.app$/.test(cleanOrigin)
  );
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked origin: ${origin}. Allowed origins:`, allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Create HTTP and Socket.IO Server
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Share io instance with Express App routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected from Socket.IO: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);

// Test Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Seed Initial Analytics Data if empty
const seedDummyData = async () => {
  try {
    // 1. Seed Users (Admin & Staff) if not present
    const adminExists = await User.findOne({ email: 'admin@gamehub.com' });
    if (!adminExists) {
      console.log('🌱 Seeding default Admin user into database...');
      await User.create({
        name: 'Admin User',
        email: 'admin@gamehub.com',
        password: '$2a$10$OYM2kdC6pIppsPaEjQhFROWqJ3zDEPjeP5FzzoW2N1R8JhZ/5Zb7a', // admin123
        role: 'admin',
      });
    } else {
      console.log('🔍 Default Admin user already exists.');
    }

    const staffExists = await User.findOne({ email: 'staff@gamehub.com' });
    if (!staffExists) {
      console.log('🌱 Seeding default Staff user into database...');
      await User.create({
        name: 'Staff Member',
        email: 'staff@gamehub.com',
        password: '$2a$10$gc95Z079MdKPu9aKC9SmsuC0Ofn7bUCvZLo3wCJbW2UY4g2y6FRO.', // staff123
        role: 'staff',
      });
    } else {
      console.log('🔍 Default Staff user already exists.');
    }

    // 2. Seed Devices if empty
    const deviceCount = await Device.countDocuments();
    if (deviceCount === 0) {
      console.log('🌱 Seeding default devices into database...');
      const defaultDevices = [
        { deviceId: 'PS5-01', name: 'PlayStation 5 Neon Blue', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PS5-02', name: 'PlayStation 5 Cyber Punk', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PS5-03', name: 'PlayStation 5 Liquid Neon', type: 'PS5', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PC-01', name: 'Asus ROG Gaming PC 01', type: 'PC', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PC-02', name: 'Asus ROG Gaming PC 02', type: 'PC', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PC-03', name: 'Razer Blade Controller PC 03', type: 'PC_Controller', status: 'available', currentCustomer: '', activeSessionId: '' },
        { deviceId: 'PC-04', name: 'Razer Blade Controller PC 04', type: 'PC_Controller', status: 'available', currentCustomer: '', activeSessionId: '' }
      ];
      for (const dev of defaultDevices) {
        await Device.create(dev);
      }
    }

    // 3. Seed Settings if empty
    const settingCount = await Setting.countDocuments();
    if (settingCount === 0) {
      console.log('🌱 Seeding default configurations into database...');
      await Setting.create({
        key: 'cafe_info',
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
        }
      });
      await Setting.create({
        key: 'pricing',
        value: {
          ps5: {
            '1': 100,
            '2': 150,
            '3': 200,
            '4': 250
          },
          pc: {
            keyboard_mouse: 80,
            controller: 100
          }
        }
      });
    }

    // 4. Seed Theme Settings if empty
    const themeCount = await ThemeSettings.countDocuments();
    if (themeCount === 0) {
      console.log('🌱 Seeding default theme settings into database...');
      await ThemeSettings.create({
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
      });
    }

    // 5. Seed Games if empty
    const gameCount = await Game.countDocuments();
    if (gameCount === 0) {
      console.log('🌱 Seeding default games into database...');
      const defaultGames = [
        { title: 'FC 26', genre: 'Sports', platform: 'PS5', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'GTA VI', genre: 'Action-Adventure', platform: 'PS5 / PC', maxPlayers: 1, imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'Tekken 8', genre: 'Fighting', platform: 'PS5', maxPlayers: 2, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'Valorant', genre: 'FPS / Tactical Shooter', platform: 'PC', maxPlayers: 5, imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'BGMI', genre: 'Battle Royale', platform: 'Mobile / PC Emulator', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'WWE 2K26', genre: 'Sports / Wrestling', platform: 'PS5', maxPlayers: 4, imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'Minecraft', genre: 'Sandbox / Survival', platform: 'PC', maxPlayers: 10, imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' },
        { title: 'Call of Duty', genre: 'FPS / Action', platform: 'PS5 / PC', maxPlayers: 12, imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=300&auto=format&fit=crop', cafeId: 'default-cafe' }
      ];
      for (const game of defaultGames) {
        await Game.create(game);
      }
    }

    const invoiceCount = await Invoice.countDocuments();
    if (invoiceCount === 0) {
      console.log('🌱 Seeding initial dummy invoices and bookings for visual display...');
      
      const now = new Date();
      const customers = [
        { name: 'Rahul Sharma', phone: '9876543210' },
        { name: 'Siddharth Patel', phone: '9823456789' },
        { name: 'Aarav Mehta', phone: '9812345670' },
        { name: 'Priya Das', phone: '9898765432' },
        { name: 'Rohan Gupta', phone: '9786543210' },
        { name: 'Neha Verma', phone: '9675432109' },
        { name: 'Vikram Singh', phone: '9564321098' }
      ];

      const devices = ['PS5-01', 'PS5-02', 'PC-01', 'PC-02', 'PC-03'];

      // Generate invoices for the last 6 days
      let count = 1;
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        const numInvs = Math.floor(Math.random() * 2) + 2;
        
        for (let j = 0; j < numInvs; j++) {
          const cust = customers[Math.floor(Math.random() * customers.length)];
          const dev = devices[Math.floor(Math.random() * devices.length)];
          const players = Math.floor(Math.random() * 3) + 1;
          const duration = [30, 60, 90, 120, 180][Math.floor(Math.random() * 5)];
          const rate = dev.startsWith('PS5') ? (players === 1 ? 100 : players === 2 ? 150 : 200) : 80;
          const subtotal = Math.round((duration / 60) * rate);
          const tax = Math.round(subtotal * 0.18);
          const totalAmount = subtotal + tax;

          const invDate = new Date(date);
          invDate.setHours(11 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

          await Invoice.create({
            invoiceNumber: `INV-${invDate.getFullYear()}-${String(count++).padStart(4, '0')}`,
            customerName: cust.name,
            customerPhone: cust.phone,
            deviceId: dev,
            playersCount: players,
            duration,
            pricingRate: rate,
            subtotal,
            tax,
            totalAmount,
            date: invDate.toISOString(),
            paymentStatus: 'paid'
          });
        }
      }

      // Seed a few sample bookings
      const bookingDates = [0, 1, 2]; // Today, tomorrow, day after
      let bCount = 1;
      const hexChars = '0123456789ABCDEF';
      for (const offset of bookingDates) {
        const bDate = new Date();
        bDate.setDate(now.getDate() + offset);
        const dateStr = bDate.toISOString().split('T')[0];

        const slots = [
          { slot: '12:00 - 14:00', start: '12:00', end: '14:00' },
          { slot: '15:00 - 16:30', start: '15:00', end: '16:30' },
          { slot: '18:00 - 20:00', start: '18:00', end: '20:00' }
        ];
        for (const slot of slots) {
          const cust = customers[Math.floor(Math.random() * customers.length)];
          const dev = devices[Math.floor(Math.random() * devices.length)];

          // Generate random hex booking ID
          let hexId = 'BK-';
          for (let k = 0; k < 6; k++) {
            hexId += hexChars[Math.floor(Math.random() * 16)];
          }

          await Booking.create({
            bookingId: hexId,
            customerName: cust.name,
            customerPhone: cust.phone,
            deviceId: dev,
            date: dateStr,
            startTime: slot.start,
            endTime: slot.end,
            timeSlot: slot.slot,
            duration: 120,
            amount: 200,
            notes: 'Prefer dual-shock controller if available.',
            status: bCount % 3 === 0 ? 'pending' : 'confirmed'
          });
          bCount++;
        }
      }

      console.log('✅ Seeding complete.');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
};

// Start Server
httpServer.listen(PORT, async () => {
  await initDatabase();
  await seedDummyData();
  console.log(`📡 Backend Server listening on http://localhost:${PORT}`);
});
