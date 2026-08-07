import { dbGet, dbRun, dbAll } from '../config/database.js';

export const DriverModel = {
  async findById(id) {
    return dbGet('SELECT * FROM drivers WHERE id = ?', [id]);
  },

  async create(driverData) {
    const {
      id,
      status = 'offline',
      rating = 5.0,
      verification_status = 'pending',
      current_latitude,
      current_longitude,
      email,
      license_number,
      license_expiry,
      license_image_url,
      rc_book_url,
      insurance_url,
      profile_photo_url,
      selfie_url,
      vehicle_images,
      is_banned = 0
    } = driverData;

    await dbRun(
      `INSERT INTO drivers (
        id, status, rating, verification_status, current_latitude, current_longitude,
        email, license_number, license_expiry, license_image_url, rc_book_url,
        insurance_url, profile_photo_url, selfie_url, vehicle_images, is_banned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, status, rating, verification_status, current_latitude, current_longitude,
        email, license_number, license_expiry, license_image_url, rc_book_url,
        insurance_url, profile_photo_url, selfie_url, vehicle_images, is_banned
      ]
    );

    return this.findById(id);
  },

  async update(id, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`;
    await dbRun(sql, values);

    return this.findById(id);
  },

  async updateStatus(id, status) {
    await dbRun("UPDATE drivers SET status = ?, last_active_at = datetime('now') WHERE id = ?", [status, id]);
    return this.findById(id);
  },

  async updateLocation(id, lat, lng, heading = 0) {
    // 1. Update location inside drivers table
    await dbRun(
      `UPDATE drivers 
       SET current_latitude = ?, current_longitude = ?, last_active_at = datetime('now') 
       WHERE id = ?`,
      [lat, lng, id]
    );

    // 2. Sync to ride_locations table
    await dbRun(
      `INSERT INTO ride_locations (driver_id, latitude, longitude, heading, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(driver_id) DO UPDATE SET
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         heading = EXCLUDED.heading,
         updated_at = EXCLUDED.updated_at`,
      [id, lat, lng, heading]
    );

    return this.findById(id);
  },

  async getNearbyDrivers(limit = 10) {
    // Fetch drivers that are online and not banned, including their user/vehicle info
    return dbAll(
      `SELECT d.*, u.full_name, u.phone, u.avatar_url, v.make, v.model, v.license_plate, v.vehicle_type
       FROM drivers d
       JOIN users u ON d.id = u.id
       LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = 1
       WHERE d.status = 'online' AND d.is_banned = 0 AND d.verification_status = 'approved'
       LIMIT ?`,
      [limit]
    );
  },

  async getAll() {
    return dbAll(
      `SELECT d.*, u.full_name, u.phone, u.avatar_url, u.account_status
       FROM drivers d
       JOIN users u ON d.id = u.id
       ORDER BY d.created_at DESC`
    );
  }
};
