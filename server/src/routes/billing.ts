import { Router, Response } from 'express';
import { Invoice } from '../models/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// @route   GET /api/billing
// @desc    Get all generated invoices
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoices = await Invoice.find();
    // Sort invoices by date descending
    const sorted = invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(sorted);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Server error fetching billing data' });
  }
});

// @route   GET /api/billing/:id
// @desc    Get single invoice details
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    console.error('Error fetching single invoice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/billing/:id/status
// @desc    Toggle payment status (paid/unpaid)
router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { paymentStatus } = req.body;
  
  if (!paymentStatus || !['paid', 'unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ message: 'Invalid payment status value' });
  }

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: { paymentStatus } },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error('Error updating invoice payment status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
