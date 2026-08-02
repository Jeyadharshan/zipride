import { NotificationService } from '../services/notificationService.js';

export const NotificationController = {
  async getNotifications(req, res) {
    // Guarantee 200 response — never return 500 for notifications
    const safeResponse = { success: true, message: 'Notifications retrieved.', unreadCount: 0, data: [] };
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json(safeResponse);
      }
      let list = [];
      let unreadCount = 0;
      try {
        list = await NotificationService.getNotifications(userId);
      } catch (e) {
        console.warn('[NotificationController] getNotifications error:', e?.message);
      }
      try {
        unreadCount = await NotificationService.getUnreadCount(userId);
      } catch (e) {
        console.warn('[NotificationController] getUnreadCount error:', e?.message);
      }
      return res.json({
        success: true,
        message: 'Notifications retrieved.',
        unreadCount: unreadCount || 0,
        data: Array.isArray(list) ? list : []
      });
    } catch (err) {
      console.warn('[NotificationController] Outer catch:', err?.message);
      return res.status(200).json(safeResponse);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const updated = await NotificationService.markAsRead(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: 'Notification marked as read.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteNotification(req, res, next) {
    try {
      await NotificationService.deleteNotification(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: 'Notification deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};
