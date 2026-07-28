import { NotificationService } from '../services/notification.service.js';

export const NotificationController = {
  async getNotifications(req, res, next) {
    try {
      const notifs = await NotificationService.getNotifications(req.user.id);
      res.json({ data: notifs });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async markAsRead(req, res, next) {
    try {
      const notif = await NotificationService.markAsRead(req.params.id);
      res.json({ data: notif });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
