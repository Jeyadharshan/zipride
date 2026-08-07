import { dbGet, dbRun, dbAll } from '../config/database.js';

export const NotificationModel = {
  async findById(id) {
    return dbGet('SELECT * FROM notifications WHERE id = ?', [id]);
  },

  async findByUserId(userId) {
    return dbAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  },

  async create(notificationData) {
    const { id, user_id, title, body, read = 0 } = notificationData;
    await dbRun(
      `INSERT INTO notifications (id, user_id, title, body, read)
       VALUES (?, ?, ?, ?, ?)`,
      [id, user_id, title, body, read]
    );
    return this.findById(id);
  },

  async markAsRead(id) {
    await dbRun('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
    return this.findById(id);
  }
};
