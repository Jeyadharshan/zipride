import express from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Require auth for payment order creation and signature verification
router.post('/create-order', requireAuth, PaymentController.createPaymentOrder);
router.post('/order', requireAuth, PaymentController.createPaymentOrder);
router.post('/verify', requireAuth, PaymentController.verifyPayment);

// Public webhook route (not requiring session JWT header verification)
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

export default router;
