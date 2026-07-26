import { NotificationService } from '../services/notificationService.js';

export const NotificationController = {
  async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({
          success: true,
          message: 'Notifications retrieved.',
          unreadCount: 0,
          data: []
        });
      }
      const list = await NotificationService.getNotifications(userId);
      const unreadCount = await NotificationService.getUnreadCount(userId);
      return res.json({
        success: true,
        message: 'Notifications retrieved.',
        unreadCount,
        data: list || []
      });
    } catch (err) {
      console.warn('[NotificationController] Error fetching notifications:', err.message);
      return res.json({
        success: true,
        message: 'Notifications retrieved.',
        unreadCount: 0,
        data: []
      });
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
