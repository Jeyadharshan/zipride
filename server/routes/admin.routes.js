import express from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', AdminController.getUsers);
router.get('/drivers', AdminController.getDrivers);
router.put('/drivers/:id/approve', AdminController.approveDriver);
router.put('/drivers/:id/reject', AdminController.rejectDriver);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSetting);
router.get('/stats', AdminController.getSystemStats);

export default router;
