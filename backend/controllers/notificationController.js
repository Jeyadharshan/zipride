import { NotificationService } from '../services/notificationService.js';

export const NotificationController = {
  async getNotifications(req, res, next) {
    try {
      const list = await NotificationService.getNotifications(req.user.id);
      const unreadCount = await NotificationService.getUnreadCount(req.user.id);
      return res.json({
        success: true,
        message: 'Notifications retrieved.',
        unreadCount,
        data: list
      });
    } catch (err) {
      next(err);
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
