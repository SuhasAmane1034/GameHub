import { Router, Response } from 'express';
import { Setting, ThemeSettings } from '../models/index.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// @route   GET /api/settings
// @desc    Get all configurations (cafe info, pricing matrices, theme settings)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cafeId = req.user?.cafeId || 'default-cafe';
    const cafeInfo = await Setting.findOne({ key: 'cafe_info', cafeId });
    const pricing = await Setting.findOne({ key: 'pricing', cafeId });
    
    let themeSettings = await ThemeSettings.findOne({ cafeId });
    if (!themeSettings) {
      // Create defaults on-demand if missing
      themeSettings = await ThemeSettings.create({
        cafeId,
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
      });
    }

    res.json({
      cafeInfo: cafeInfo ? cafeInfo.value : {},
      pricing: pricing ? pricing.value : {},
      themeSettings: themeSettings
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
});

// @route   PUT /api/settings/cafe
// @desc    Update cafe details, tagline, contact info, working hours, and taxes
router.put('/cafe', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const cafeId = req.user?.cafeId || 'default-cafe';
  const newInfo = req.body;

  if (!newInfo.name || !newInfo.address) {
    return res.status(400).json({ message: 'Please provide cafe name and address' });
  }

  try {
    const existing = await Setting.findOne({ key: 'cafe_info', cafeId });
    
    let updated;
    if (existing) {
      updated = await Setting.findByIdAndUpdate(
        existing._id,
        { $set: { value: newInfo } },
        { new: true }
      );
    } else {
      updated = await Setting.create({ key: 'cafe_info', value: newInfo, cafeId });
    }

    // Trigger dynamic settings update via sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('settings_updated');
    }

    res.json({ message: 'Cafe details updated successfully', value: updated.value });
  } catch (err) {
    console.error('Error updating cafe info settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/settings/pricing
// @desc    Update game pricing rules (Admin only)
router.put('/pricing', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const cafeId = req.user?.cafeId || 'default-cafe';
  const { ps5, pc } = req.body;

  if (!ps5 || !pc) {
    return res.status(400).json({ message: 'Please provide ps5 and pc pricing details' });
  }

  try {
    const existing = await Setting.findOne({ key: 'pricing', cafeId });
    const newValue = { ps5, pc };

    let updated;
    if (existing) {
      updated = await Setting.findByIdAndUpdate(
        existing._id,
        { $set: { value: newValue } },
        { new: true }
      );
    } else {
      updated = await Setting.create({ key: 'pricing', value: newValue, cafeId });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('settings_updated');
    }

    res.json({ message: 'Pricing configurations updated successfully', value: updated.value });
  } catch (err) {
    console.error('Error updating pricing settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/settings/appearance
// @desc    Update cafe theme engine (Admin only)
router.put('/appearance', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const cafeId = req.user?.cafeId || 'default-cafe';
  const appearanceSettings = req.body;

  try {
    let theme = await ThemeSettings.findOne({ cafeId });
    
    if (theme) {
      theme = await ThemeSettings.findByIdAndUpdate(
        theme._id,
        { $set: appearanceSettings },
        { new: true }
      );
    } else {
      theme = await ThemeSettings.create({
        ...appearanceSettings,
        cafeId
      });
    }

    // Emit live socket broadcast to trigger styling refetch
    const io = req.app.get('io');
    if (io) {
      io.emit('theme_updated');
      io.emit('settings_updated');
    }

    res.json({ message: 'Appearance settings updated successfully', value: theme });
  } catch (err) {
    console.error('Error updating theme settings:', err);
    res.status(500).json({ message: 'Server error updating appearance' });
  }
});

export default router;
