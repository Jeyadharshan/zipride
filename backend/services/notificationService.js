// backend/services/notificationService.js
// Production Notification Service — Persistence in MongoDB Atlas & TiDB MySQL + Real-time Socket.IO Popup

import crypto from 'crypto';
import { NotificationRepository } from '../repositories/notificationRepository.js';
import { getMongoDB, connectMongoDB } from '../config/mongodb.js';
import { sendToUser, broadcastToAdmins } from '../socket/socket.js';
import db from '../config/db.js';

export const NotificationService = {
  async getNotifications(userId) {
    if (!userId) return [];
    let mongoDocs = [];
    try {
      let mdb = getMongoDB();
      if (!mdb) mdb = await connectMongoDB();
      if (mdb) {
        mongoDocs = await mdb.collection('notifications')
          .find({ $or: [{ userId }, { profileId: userId }] })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();
      }
    } catch (e) {}

    if (mongoDocs.length > 0) {
      return mongoDocs.map(m => ({
        id: m._id?.toString() || m.id,
        title: m.title,
        message: m.message || m.body,
        body: m.message || m.body,
        type: m.type || 'System',
        is_read: m.isRead || m.is_read ? 1 : 0,
        created_at: m.createdAt || m.created_at
      }));
    }

    try {
      const mysqlDocs = await NotificationRepository.findByProfileId(userId, { limit: 50 });
      return mysqlDocs || [];
    } catch (err) {
      console.warn('[Notification Service] Fetch notifications failed:', err.message);
      return [];
    }
  },

  async sendPushNotification(userId, title, body, data = {}) {
    const notifObj = {
      id: crypto.randomUUID(),
      profileId: userId,
      userId,
      title,
      message: body,
      body,
      type: data.type || 'System',
      isRead: false,
      createdAt: new Date(),
      data
    };

    // 1. Write to MySQL
    await NotificationRepository.create({
      profileId: userId,
      title,
      message: body,
      type: data.type || 'System'
    }).catch(() => {});

    // 2. Write to MongoDB Atlas
    try {
      let mdb = getMongoDB();
      if (!mdb) mdb = await connectMongoDB();
      if (mdb) {
        await mdb.collection('notifications').insertOne(notifObj);
      }
    } catch (e) {}

    // 3. Emit real-time Socket.IO popup to user socket
    sendToUser(userId, 'notification', notifObj);
    sendToUser(userId, 'notification-count', { count: await this.getUnreadCount(userId) });

    console.log(`[Notification] 🔔 Sent real-time to ${userId}: "${title}"`);
    return { success: true, notification: notifObj };
  },

  async getUnreadCount(userId) {
    try {
      return await NotificationRepository.countUnread(userId);
    } catch (e) {
      return 0;
    }
  },

  async markAsRead(notificationId, userId) {
    await NotificationRepository.markAsRead(notificationId, userId);
    try {
      let mdb = getMongoDB();
      if (mdb) {
        await mdb.collection('notifications').updateOne(
          { $or: [{ id: notificationId }, { _id: notificationId }] },
          { $set: { isRead: true } }
        );
      }
    } catch (e) {}
    return { success: true };
  },

  async deleteNotification(notificationId, userId) {
    try {
      await db.execute(`DELETE FROM notifications WHERE id = ? AND profile_id = ?`, [notificationId, userId]);
    } catch (e) {}
    try {
      let mdb = getMongoDB();
      if (mdb) {
        await mdb.collection('notifications').deleteOne({
          $or: [{ id: notificationId }, { _id: notificationId }]
        });
      }
    } catch (e) {}
    return { success: true };
  }
};

export default NotificationService;
