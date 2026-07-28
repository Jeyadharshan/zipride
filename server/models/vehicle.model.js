import { dbGet, dbRun, dbAll } from '../config/database.js';

export const VehicleModel = {
  async findById(id) {
    return dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
  },

  async findByDriverId(driverId) {
    return dbGet('SELECT * FROM vehicles WHERE driver_id = ? AND is_active = 1', [driverId]);
  },

  async create(vehicleData) {
    const {
      id,
      driver_id,
      make,
      model,
      year,
      color,
      license_plate,
      vehicle_type,
      is_active = 1
    } = vehicleData;

    await dbRun(
      `INSERT INTO vehicles (
        id, driver_id, make, model, year, color, license_plate, vehicle_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, driver_id, make, model, year, color, license_plate, vehicle_type, is_active]
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

    const sql = `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`;
    await dbRun(sql, values);

    return this.findById(id);
  }
};
