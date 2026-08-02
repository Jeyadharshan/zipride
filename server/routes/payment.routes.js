import express from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/create', PaymentController.createPayment);
router.post('/verify', PaymentController.verifyPayment);

export default router;
