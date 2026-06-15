import { Router, Response } from 'express';
import { Session, Device, Invoice, Setting } from '../models/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper to calculate elapsed time in seconds for a session
const getSessionSeconds = (session: any, nowIso: string) => {
  const start = new Date(session.startTime).getTime();
  const now = new Date(nowIso).getTime();
  const rawElapsed = Math.max(0, (now - start) / 1000); // in seconds

  let totalPausedSeconds = 0;
  if (session.pauseLogs && session.pauseLogs.length > 0) {
    for (const log of session.pauseLogs) {
      const pStart = new Date(log.pausedAt).getTime();
      const pEnd = log.resumedAt ? new Date(log.resumedAt).getTime() : now;
      totalPausedSeconds += Math.max(0, (pEnd - pStart) / 1000);
    }
  }

  return Math.max(0, Math.round(rawElapsed - totalPausedSeconds));
};

// @route   GET /api/sessions
// @desc    Get all sessions (active or past)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const sessions = await Session.find(filter);
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sessions/start
// @desc    Start a new gaming session
router.post('/start', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { customerName, customerPhone, deviceId, playersCount, gameName, duration, pricingRate } = req.body;

  if (!customerName || !customerPhone || !deviceId || !pricingRate) {
    return res.status(400).json({ message: 'Provide customerName, customerPhone, deviceId, and pricingRate' });
  }

  try {
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (device.status === 'occupied') {
      return res.status(400).json({ message: 'Device is already occupied' });
    }
    if (device.status === 'maintenance') {
      return res.status(400).json({ message: 'Device is under maintenance' });
    }

    const now = new Date().toISOString();
    
    // Create session
    const session = await Session.create({
      customerName,
      customerPhone,
      deviceId: device.deviceId,
      playersCount: Number(playersCount) || 1,
      gameName: gameName || 'General Gaming',
      duration: Number(duration), // in minutes, -1 for unlimited
      startTime: now,
      status: 'active',
      pricingRate: Number(pricingRate),
      totalAmount: 0,
      pauseLogs: [],
      extensionLogs: [],
    });

    // Update Device status
    await Device.findByIdAndUpdate(deviceId, {
      $set: {
        status: 'occupied',
        currentCustomer: customerName,
        activeSessionId: session._id,
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('devices_updated');
      io.emit('sessions_updated');
    }

    res.status(201).json(session);
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ message: 'Server error starting session' });
  }
});

// @route   PUT /api/sessions/:id/pause
// @desc    Pause active session
router.put('/:id/pause', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Only active sessions can be paused' });
    }

    const now = new Date().toISOString();
    const elapsedSeconds = getSessionSeconds(session, now);

    // Add entry to pauseLogs
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'paused' },
        $push: {
          pauseLogs: {
            pausedAt: now,
            resumedAt: '',
            elapsedBeforePause: elapsedSeconds
          }
        }
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('sessions_updated');
    }

    res.json(updatedSession);
  } catch (err) {
    console.error('Error pausing session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sessions/:id/resume
// @desc    Resume paused session
router.put('/:id/resume', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status !== 'paused') {
      return res.status(400).json({ message: 'Only paused sessions can be resumed' });
    }

    const now = new Date().toISOString();
    
    // Find the active pause log and update resumedAt
    const pauseLogs = [...session.pauseLogs];
    const activePauseIdx = pauseLogs.findIndex(log => !log.resumedAt);
    if (activePauseIdx !== -1) {
      pauseLogs[activePauseIdx].resumedAt = now;
    }

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'active',
          pauseLogs
        }
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('sessions_updated');
    }

    res.json(updatedSession);
  } catch (err) {
    console.error('Error resuming session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sessions/:id/extend
// @desc    Extend session duration (minutes)
router.put('/:id/extend', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { additionalMinutes } = req.body;

  if (!additionalMinutes || isNaN(additionalMinutes) || Number(additionalMinutes) <= 0) {
    return res.status(400).json({ message: 'Provide a valid number of additional minutes' });
  }

  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Cannot extend a completed session' });
    }
    if (session.duration === -1) {
      return res.status(400).json({ message: 'Cannot extend an unlimited session' });
    }

    const now = new Date().toISOString();
    const newDuration = session.duration + Number(additionalMinutes);

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      {
        $set: { duration: newDuration },
        $push: {
          extensionLogs: {
            extendedAt: now,
            additionalMinutes: Number(additionalMinutes)
          }
        }
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('sessions_updated');
    }

    res.json(updatedSession);
  } catch (err) {
    console.error('Error extending session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sessions/:id/end
// @desc    End session and generate invoice
router.post('/:id/end', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session is already completed' });
    }

    const now = new Date().toISOString();
    
    // Calculate actual elapsed minutes
    const elapsedSeconds = getSessionSeconds(session, now);
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60)); // Minimum charge of 1 minute
    
    // Total cost calculation
    const hourlyRate = session.pricingRate;
    const ratePerMinute = hourlyRate / 60;
    
    // Standard logic: Charge based on actual elapsed minutes
    let rawAmount = elapsedMinutes * ratePerMinute;
    
    // If it's a fixed duration and they used LESS than the duration,
    // we charge for the pre-booked duration. This is standard in gaming cafes.
    // However, if it's unlimited (-1), we charge for exact elapsed time.
    if (session.duration > 0 && elapsedMinutes < session.duration) {
      rawAmount = session.duration * ratePerMinute;
    }
    
    // Round to nearest Rupee
    const subtotal = Math.round(rawAmount);

    // Fetch GST settings
    const infoSetting = await Setting.findOne({ key: 'cafe_info' });
    const enableGst = infoSetting?.value?.enableGst || false;
    const gstRate = infoSetting?.value?.gstRate || 18;
    
    const tax = enableGst ? Math.round(subtotal * (gstRate / 100)) : 0;
    const totalAmount = subtotal + tax;

    // Free the Device
    const device = await Device.findOne({ deviceId: session.deviceId });
    if (device) {
      await Device.findByIdAndUpdate(device._id, {
        $set: {
          status: 'available',
          currentCustomer: '',
          activeSessionId: ''
        }
      });
    }

    // Generate Invoice Number
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create Invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      deviceId: session.deviceId,
      playersCount: session.playersCount,
      duration: elapsedMinutes,
      pricingRate: hourlyRate,
      subtotal,
      tax,
      totalAmount,
      date: now,
      paymentStatus: 'paid', // Mark as paid by default upon completion
    });

    // Update Session status to completed
    await Session.findByIdAndUpdate(req.params.id, {
      $set: {
        status: 'completed',
        endTime: now,
        totalAmount: totalAmount,
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('devices_updated');
      io.emit('sessions_updated');
    }

    res.json({
      message: 'Session completed successfully',
      session,
      invoice
    });
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ message: 'Server error ending session' });
  }
});

export default router;
