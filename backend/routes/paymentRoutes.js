import express from 'express';
import db from '../config/db.js';
import { PaymentController } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/payments & GET /api/payments
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const profileId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [rows] = await db.execute(
      `SELECT r.id AS ride_id,
              COALESCE(r.final_fare, r.estimated_fare, 0) AS amount,
              r.pickup_address, r.drop_address, r.ride_status, r.payment_status,
              r.created_time AS date,
              COALESCE(p.payment_method, 'Wallet') AS payment_method,
              p.transaction_id, p.gateway_order_id,
              COALESCE(rt.amount, 0) AS tip_amount,
              CASE WHEN p.payment_method = 'Wallet' OR p.payment_method IS NULL THEN 1 ELSE 0 END AS wallet_used,
              CASE WHEN p.payment_method = 'Razorpay' OR p.payment_method = 'UPI' OR p.gateway = 'Razorpay' THEN 1 ELSE 0 END AS razorpay_used,
              dp.profile_photo AS driver_photo,
              dp.driving_licence_number AS driver_license,
              prof.full_name AS driver_name, prof.phone AS driver_phone
       FROM rides r
       LEFT JOIN payments p ON r.id = p.ride_id
       LEFT JOIN ride_tips rt ON r.id = rt.ride_id AND rt.rider_id = r.rider_id
       LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
       LEFT JOIN profiles prof ON dp.profile_id = prof.id
       WHERE r.rider_id = ?
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [profileId, limit, offset]
    );

    return res.json({
      success: true,
      message: 'Payment history retrieved.',
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

import { WebhookController } from '../controllers/webhookController.js';

router.get('/receipt/:rideId', requireAuth, PaymentController.getReceipt);
router.get('/:rideId/receipt', requireAuth, PaymentController.getReceipt);
router.post('/webhook', WebhookController.handleRazorpayWebhook);

export default router;
