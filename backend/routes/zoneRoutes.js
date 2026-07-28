// backend/routes/zoneRoutes.js
import express from 'express';
import { ZoneController } from '../controllers/zoneController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ZoneController.listZones);
router.post('/check', ZoneController.checkLocation);
router.get('/:id', ZoneController.getZone);
router.post('/', requireAuth, requireAdmin, ZoneController.createZone);
router.put('/:id', requireAuth, requireAdmin, ZoneController.updateZone);
router.delete('/:id', requireAuth, requireAdmin, ZoneController.deleteZone);

export default router;
