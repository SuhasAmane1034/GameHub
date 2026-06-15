import { Router, Response } from 'express';
import { Device, Setting, ThemeSettings, Game, Booking, Customer } from '../models/index.js';

const router = Router();

// Helper to generate a unique random hex booking ID
const generateBookingId = async (): Promise<string> => {
  const hexChars = '0123456789ABCDEF';
  let bookingId = '';
  let unique = false;

  while (!unique) {
    let hex = 'BK-';
    for (let i = 0; i < 6; i++) {
      hex += hexChars[Math.floor(Math.random() * 16)];
    }
    const exists = await Booking.findOne({ bookingId: hex });
    if (!exists) {
      bookingId = hex;
      unique = true;
    }
  }
  return bookingId;
};

// @route   GET /api/public/crowd
// @desc    Get fast aggregates for occupancy & crowd level
router.get('/crowd', async (req, res) => {
  try {
    const { cafeId = 'default-cafe' } = req.query;
    const devices = await Device.find({ cafeId });
    
    const ps5s = devices.filter(d => d.type === 'PS5');
    const pcs = devices.filter(d => d.type === 'PC' || d.type === 'PC_Controller');

    const totalPs5 = ps5s.length;
    const ps5Available = ps5s.filter(d => d.status === 'available').length;

    const totalPc = pcs.length;
    const pcAvailable = pcs.filter(d => d.status === 'available').length;

    const totalDevices = devices.length;
    const occupiedDevices = devices.filter(d => d.status === 'occupied').length;

    let crowdLevel = 'Low';
    if (totalDevices > 0) {
      const occupancyRate = (occupiedDevices / totalDevices) * 100;
      if (occupancyRate > 70) {
        crowdLevel = 'High';
      } else if (occupancyRate > 30) {
        crowdLevel = 'Moderate';
      }
    }

    res.json({
      ps5Available,
      totalPs5,
      pcAvailable,
      totalPc,
      crowdLevel
    });
  } catch (err) {
    console.error('Error fetching public crowd stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/public/devices
// @desc    Get all devices status (live occupancy)
router.get('/devices', async (req, res) => {
  try {
    const { cafeId = 'default-cafe' } = req.query;
    const devices = await Device.find({ cafeId });
    res.json(devices);
  } catch (err) {
    console.error('Error fetching public devices status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/public/pricing
// @desc    Get game and station hourly rates
router.get('/pricing', async (req, res) => {
  try {
    const { cafeId = 'default-cafe' } = req.query;
    const pricing = await Setting.findOne({ key: 'pricing', cafeId });
    res.json(pricing ? pricing.value : {});
  } catch (err) {
    console.error('Error fetching public pricing rates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/public/games
// @desc    Get games library
router.get('/games', async (req, res) => {
  try {
    const { cafeId = 'default-cafe' } = req.query;
    const games = await Game.find({ cafeId });
    res.json(games);
  } catch (err) {
    console.error('Error fetching public games library:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/public/settings
// @desc    Get cafe profile & theme settings (Branding, Appearance, Contact, etc.)
router.get('/settings', async (req, res) => {
  try {
    const { cafeId = 'default-cafe' } = req.query;
    const cafeInfo = await Setting.findOne({ key: 'cafe_info', cafeId });
    const themeSettings = await ThemeSettings.findOne({ cafeId });

    res.json({
      cafeInfo: cafeInfo ? cafeInfo.value : {},
      themeSettings: themeSettings || {}
    });
  } catch (err) {
    console.error('Error fetching settings & theme config:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/public/bookings
// @desc    Submit a new booking request (overlap validation)
router.post('/bookings', async (req, res): Promise<any> => {
  const {
    customerName,
    phoneNumber,
    deviceId,
    date,
    startTime,
    endTime,
    duration,
    amount,
    notes = '',
    cafeId = 'default-cafe'
  } = req.body;

  if (!customerName || !phoneNumber || !deviceId || !date || !startTime || !endTime || !duration || amount === undefined) {
    return res.status(400).json({ message: 'Please fill all required booking details.' });
  }

  try {
    // Check if device is valid
    const device = await Device.findOne({ deviceId, cafeId });
    if (!device) {
      return res.status(404).json({ message: 'Station device not found.' });
    }

    // Check if device is under maintenance
    if (device.status === 'maintenance') {
      return res.status(400).json({ message: 'This device is currently under maintenance and cannot be booked.' });
    }

    // Check overlap for confirmed/pending bookings
    const conflicts = await Booking.find({
      deviceId,
      date,
      status: { $in: ['confirmed', 'pending'] },
      cafeId
    });

    const hasOverlap = conflicts.some(b => {
      // Overlap condition: S1 < E2 and S2 < E1
      return startTime < b.endTime && b.startTime < endTime;
    });

    if (hasOverlap) {
      return res.status(400).json({ message: 'The requested time slot overlaps with an existing booking for this station.' });
    }

    // Generate non-sequential Hex booking ID
    const bookingId = await generateBookingId();
    const timeSlot = `${startTime} - ${endTime}`;

    const newBooking = await Booking.create({
      bookingId,
      customerName,
      customerPhone: phoneNumber, // save to customerPhone for model compliance
      deviceId,
      date,
      startTime,
      endTime,
      timeSlot,
      duration: Number(duration),
      amount: Number(amount),
      notes,
      status: 'pending', // Starts as pending for admin approval
      cafeId
    });

    // Create or update customer profile
    let customer = await Customer.findOne({ mobileNumber: phoneNumber, cafeId });
    if (!customer) {
      await Customer.create({
        name: customerName,
        mobileNumber: phoneNumber,
        lastVisit: date,
        totalVisits: 1,
        cafeId
      });
    } else {
      await Customer.findByIdAndUpdate(customer._id, {
        $set: { lastVisit: date },
        $inc: { totalVisits: 1 }
      });
    }

    // Notify admins via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_updated', newBooking);
      io.emit('new_booking_notification', {
        message: `New booking ${bookingId} created by ${customerName}!`,
        booking: newBooking
      });
    }

    res.status(201).json(newBooking);
  } catch (err) {
    console.error('Error creating booking reservation:', err);
    res.status(500).json({ message: 'Server error creating booking' });
  }
});

// @route   GET /api/public/bookings/:bookingId
// @desc    Track a guest booking status
router.get('/bookings/:bookingId', async (req, res): Promise<any> => {
  const { bookingId } = req.params;
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ message: 'Please provide phone number associated with the booking.' });
  }

  try {
    const booking = await Booking.findOne({ bookingId, customerPhone: String(phone) });
    if (!booking) {
      return res.status(404).json({ message: 'No matching booking found for the provided details.' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error tracking booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
