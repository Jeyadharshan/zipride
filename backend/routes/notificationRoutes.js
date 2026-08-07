import express from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Wrap the GET handler to guarantee 200 (never 500) for notification fetching
router.get('/', requireAuth, async (req, res, next) => {
  try {
    await NotificationController.getNotifications(req, res);
  } catch (err) {
    console.warn('[NotifRoute] Unexpected error:', err?.message);
    if (!res.headersSent) {
      res.status(200).json({ success: true, message: 'Notifications retrieved.', unreadCount: 0, data: [] });
    }
  }
});
router.put('/:id/read', requireAuth, NotificationController.markAsRead);
router.post('/:id/read', requireAuth, NotificationController.markAsRead);
router.delete('/:id', requireAuth, NotificationController.deleteNotification);

export default router;
