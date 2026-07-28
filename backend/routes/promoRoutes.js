// backend/routes/promoRoutes.js
import express from 'express';
import { PromoController } from '../controllers/promoController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public/Rider routes
router.post('/apply', requireAuth, PromoController.applyPromo);

// Admin routes
router.get('/', requireAuth, requireAdmin, PromoController.listPromos);
router.post('/', requireAuth, requireAdmin, PromoController.createPromo);
router.put('/:id', requireAuth, requireAdmin, PromoController.updatePromo);
router.delete('/:id', requireAuth, requireAdmin, PromoController.deletePromo);

export default router;
