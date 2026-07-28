import crypto from 'crypto';
import { NotificationModel } from '../models/notification.model.js';

export const NotificationService = {
  async getNotifications(userId) {
    return NotificationModel.findByUserId(userId);
  },

  async createNotification(userId, title, body) {
    const notifId = crypto.randomUUID();
    return NotificationModel.create({
      id: notifId,
      user_id: userId,
      title: title,
      body: body,
      read: 0
    });
  },

  async markAsRead(notificationId) {
    return NotificationModel.markAsRead(notificationId);
  }
};
