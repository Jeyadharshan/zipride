// backend/routes/sosRoutes.js
import express from 'express';
import { SosController } from '../controllers/sosController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, SosController.triggerSos);
router.get('/', requireAuth, requireAdmin, SosController.listSosRequests);
router.put('/:id/resolve', requireAuth, requireAdmin, SosController.resolveSos);

export default router;
