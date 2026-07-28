import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { TipService } from '../services/tipService.js';

const router = express.Router();

// POST /api/v1/tips
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { rideId, amount, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await TipService.addTip({
      riderId: req.user.id,
      rideId,
      amount,
      paymentMethod: payment_method || 'Wallet',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    return res.json(result);
  } catch (err) {
    if (err.code === 'INSUFFICIENT_WALLET_BALANCE') {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_WALLET_BALANCE',
        message: err.message
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
