import { Router, Response } from 'express';
import { Device } from '../models/index.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// @route   GET /api/devices
// @desc    Get all devices
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    console.error('Error fetching devices:', err);
    res.status(500).json({ message: 'Server error fetching devices' });
  }
});

// @route   POST /api/devices
// @desc    Add new device (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { deviceId, name, type, status } = req.body;

  if (!deviceId || !name || !type) {
    return res.status(400).json({ message: 'Please provide deviceId, name, and type' });
  }

  try {
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ message: 'Device ID already exists' });
    }

    const newDevice = await Device.create({
      deviceId,
      name,
      type,
      status: status || 'available',
      currentCustomer: '',
      activeSessionId: '',
    });

    const io = req.app.get('io');
    if (io) io.emit('devices_updated');

    res.status(201).json(newDevice);
  } catch (err) {
    console.error('Error adding device:', err);
    res.status(500).json({ message: 'Server error adding device' });
  }
});

// @route   PUT /api/devices/:id
// @desc    Update device properties (Admin only, status can be edited by staff elsewhere)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { name, type, status } = req.body;

  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (status) updateData.status = status;

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('devices_updated');

    res.json(updatedDevice);
  } catch (err) {
    console.error('Error updating device:', err);
    res.status(500).json({ message: 'Server error updating device' });
  }
});

// @route   PUT /api/devices/:id/maintenance
// @desc    Toggle device maintenance status
router.put('/:id/maintenance', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { isMaintenance } = req.body;

  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (device.status === 'occupied') {
      return res.status(400).json({ message: 'Cannot set an occupied device to maintenance' });
    }

    const newStatus = isMaintenance ? 'maintenance' : 'available';
    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus } },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('devices_updated');

    res.json(updatedDevice);
  } catch (err) {
    console.error('Error setting maintenance mode:', err);
    res.status(500).json({ message: 'Server error setting maintenance status' });
  }
});

// @route   DELETE /api/devices/:id
// @desc    Delete device (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (device.status === 'occupied') {
      return res.status(400).json({ message: 'Cannot delete an occupied device' });
    }

    await Device.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    if (io) io.emit('devices_updated');

    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    console.error('Error deleting device:', err);
    res.status(500).json({ message: 'Server error deleting device' });
  }
});

export default router;
