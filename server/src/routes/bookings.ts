import { Router, Response } from 'express';
import { Booking, Device } from '../models/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// @route   GET /api/bookings
// @desc    Get all bookings
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.query;
    const filter = date ? { date: String(date) } : {};
    const bookings = await Booking.find(filter);
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/bookings
// @desc    Create a new booking reservation
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { customerName, customerPhone, deviceId, date, timeSlot, notes } = req.body;

  if (!customerName || !customerPhone || !deviceId || !date || !timeSlot) {
    return res.status(400).json({ message: 'Please provide name, phone, device, date, and timeslot' });
  }

  try {
    // Check if device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      // Try searching by _id too
      const deviceByDbId = await Device.findById(deviceId);
      if (!deviceByDbId) {
        return res.status(404).json({ message: 'Device not found' });
      }
    }

    // Check if slot is already booked for this device on this date
    const conflictingBooking = await Booking.findOne({
      deviceId,
      date,
      timeSlot,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'This timeslot is already reserved for this device' });
    }

    const hexChars = '0123456789ABCDEF';
    let hexId = 'BK-';
    for (let k = 0; k < 6; k++) {
      hexId += hexChars[Math.floor(Math.random() * 16)];
    }

    let startTime = '12:00';
    let endTime = '13:00';
    if (timeSlot && timeSlot.includes('-')) {
      const parts = timeSlot.split('-');
      startTime = parts[0].trim();
      endTime = parts[1].trim();
    }

    let duration = 60;
    try {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      duration = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
    } catch (e) {}

    const booking = await Booking.create({
      bookingId: hexId,
      customerName,
      customerPhone,
      deviceId,
      date,
      startTime,
      endTime,
      timeSlot,
      duration,
      amount: Math.round((duration / 60) * 100),
      notes: notes || '',
      status: 'confirmed',
    });

    const io = req.app.get('io');
    if (io) io.emit('bookings_updated');

    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking status or slot details
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { status, date, timeSlot, notes } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (date) updateData.date = date;
    if (timeSlot) updateData.timeSlot = timeSlot;
    if (notes !== undefined) updateData.notes = notes;

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('bookings_updated');

    res.json(updatedBooking);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Cancel/Delete booking reservation
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    if (io) io.emit('bookings_updated');

    res.json({ message: 'Booking cancelled and deleted successfully' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
