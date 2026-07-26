// backend/repositories/notificationRepository.js
// Uses actual schema: notifications (profile_id, title, message, notification_type, is_read)

import db from '../config/db.js';

export const NotificationRepository = {
  async create(data) {
    const { profileId, title, message, body, type = 'System' } = data;
    const notifBody = body || message || '';
    try {
      const [result] = await db.execute(
        `INSERT INTO notifications (profile_id, title, body, message, notification_type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [profileId, title, notifBody, notifBody, type]
      );
      return result.insertId;
    } catch (err) {
      // Fallback: write only the columns that exist (handles schema drift)
      try {
        const [result2] = await db.execute(
          `INSERT INTO notifications (profile_id, title, is_read, created_at) VALUES (?, ?, 0, NOW())`,
          [profileId, title]
        );
        return result2.insertId;
      } catch (e2) {
        console.warn('[NotificationRepo] create fallback failed:', e2.message);
        return null;
      }
    }
  },

  async findByProfileId(profileId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
    try {
      let sql = `SELECT * FROM notifications WHERE profile_id = ?`;
      const params = [String(profileId)];
      if (unreadOnly) { sql += ` AND is_read = 0`; }
      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
      const [rows] = await db.query(sql, params);
      return rows || [];
    } catch (err) {
      console.warn('[NotificationRepo] findByProfileId query error:', err.message);
      return [];
    }
  },

  async countUnread(profileId) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS total FROM notifications WHERE profile_id = ? AND is_read = 0`,
        [String(profileId)]
      );
      return rows[0]?.total || 0;
    } catch (e) {
      return 0;
    }
  },

  async markAsRead(id, profileId) {
    try {
      await db.query(
        `UPDATE notifications SET is_read = 1 WHERE id = ? AND profile_id = ?`,
        [id, String(profileId)]
      );
    } catch (e) {}
  },

  async markAllRead(profileId) {
    try {
      await db.query(
        `UPDATE notifications SET is_read = 1 WHERE profile_id = ?`,
        [String(profileId)]
      );
    } catch (e) {}
  },
};

export default NotificationRepository;
