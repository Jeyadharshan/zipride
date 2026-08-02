// backend/repositories/userRepository.js
// All SQL for rider profile — uses actual schema: profiles, favourite_locations, recent_locations

import db from '../config/db.js';

export const UserRepository = {
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, username, full_name, phone, email, role, profile_image,
              referral_code, account_status, phone_verified, date_of_birth,
              gender, address, last_login, created_at
       FROM profiles WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateProfile(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['full_name', 'email', 'address', 'date_of_birth', 'gender', 'profile_image'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return;
    values.push(id);
    await db.execute(
      `UPDATE profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  },

  // Favourite locations
  async getFavourites(profileId) {
    const [rows] = await db.execute(
      `SELECT * FROM favourite_locations WHERE profile_id = ? ORDER BY created_at DESC`,
      [profileId]
    );
    return rows;
  },

  async addFavourite(profileId, data) {
    const { label, address, latitude, longitude } = data;
    const [result] = await db.execute(
      `INSERT INTO favourite_locations (profile_id, label, address, latitude, longitude, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [profileId, label, address, latitude, longitude]
    );
    return result.insertId;
  },

  async removeFavourite(id, profileId) {
    await db.execute(
      `DELETE FROM favourite_locations WHERE id = ? AND profile_id = ?`,
      [id, profileId]
    );
  },

  // Recent locations
  async getRecentPlaces(profileId, limit = 10) {
    const [rows] = await db.execute(
      `SELECT * FROM recent_locations WHERE profile_id = ? ORDER BY visited_at DESC LIMIT ?`,
      [profileId, limit]
    );
    return rows;
  },

  async upsertRecentPlace(profileId, data) {
    const { address, latitude, longitude } = data;
    await db.execute(
      `INSERT INTO recent_locations (profile_id, address, latitude, longitude, visited_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE visited_at = NOW()`,
      [profileId, address, latitude, longitude]
    );
  },

  // Refresh token storage
  async saveRefreshToken(profileId, token) {
    try {
      await db.execute(
        `INSERT INTO login_history (profile_id, ip_address, device_info, login_time)
         VALUES (?, 'refresh_token', ?, NOW())`,
        [profileId, token]
      );
    } catch (e) {
      console.warn('[UserRepository] saveRefreshToken log failed:', e.message);
    }
  },

  async getRefreshToken(profileId) {
    // Try to retrieve from login_history first
    const [histRows] = await db.execute(
      `SELECT device_info FROM login_history WHERE profile_id = ? AND ip_address = 'refresh_token' ORDER BY login_time DESC LIMIT 1`,
      [profileId]
    ).catch(() => [[]]);;
    if (histRows && histRows[0]) return histRows[0].device_info;

    // Fallback: try address JSON field
    const [profRows] = await db.execute(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(address, '$.refresh_token')) AS token FROM profiles WHERE id = ? LIMIT 1`,
      [profileId]
    ).catch(() => [[]]);;
    return profRows?.[0]?.token || null;
  },
};

export default UserRepository;
