import { Router, Response } from 'express';
import { Invoice, Session } from '../models/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// @route   GET /api/customers
// @desc    Get aggregated list of customers
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoices = await Invoice.find();
    const sessions = await Session.find();
    
    // Group by phone number (standard identifier)
    const customerMap: { [phone: string]: {
      name: string;
      phone: string;
      totalVisits: number;
      totalSpending: number;
      lastVisit: string;
      gamesList: { [game: string]: number };
      favoriteGames: string[];
    }} = {};

    // Process completed invoices for spending and visits
    invoices.forEach(inv => {
      const phone = inv.customerPhone;
      if (!phone) return;

      if (!customerMap[phone]) {
        customerMap[phone] = {
          name: inv.customerName,
          phone: phone,
          totalVisits: 0,
          totalSpending: 0,
          lastVisit: inv.date,
          gamesList: {},
          favoriteGames: []
        };
      }

      customerMap[phone].totalVisits += 1;
      customerMap[phone].totalSpending += inv.totalAmount;
      
      if (new Date(inv.date).getTime() > new Date(customerMap[phone].lastVisit).getTime()) {
        customerMap[phone].lastVisit = inv.date;
      }
    });

    // Process sessions to find favorite games/devices
    sessions.forEach(sess => {
      const phone = sess.customerPhone;
      if (!phone || !customerMap[phone]) return;

      const game = sess.gameName || 'General Gaming';
      if (!customerMap[phone].gamesList[game]) {
        customerMap[phone].gamesList[game] = 0;
      }
      customerMap[phone].gamesList[game] += 1;
    });

    // Populate top games
    Object.keys(customerMap).forEach(phone => {
      const cust = customerMap[phone];
      const sortedGames = Object.entries(cust.gamesList)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
      
      cust.favoriteGames = sortedGames.length > 0 ? sortedGames : ['FC 24', 'GTA V', 'Spider-Man 2'];
    });

    // Convert map to array
    const customersArray = Object.values(customerMap);

    // Apply simple query filters if present
    const { search } = req.query;
    let filtered = customersArray;
    if (search) {
      const s = String(search).toLowerCase();
      filtered = customersArray.filter(
        c => c.name.toLowerCase().includes(s) || c.phone.includes(s)
      );
    }

    res.json(filtered);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
