import express from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);

export default router;
