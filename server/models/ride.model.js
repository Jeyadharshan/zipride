import { dbGet, dbRun, dbAll } from '../config/database.js';

export const RideModel = {
  async findById(id) {
    return dbGet('SELECT * FROM rides WHERE id = ?', [id]);
  },

  async getRideDetails(rideId) {
    const ride = await this.findById(rideId);
    if (!ride) return null;

    // Fetch rider profile details
    const rider = await dbGet(
      'SELECT full_name, phone, avatar_url, email FROM users WHERE id = ?',
      [ride.rider_id]
    );

    // Fetch driver profile details
    let driver = null;
    if (ride.driver_id) {
      const driverUser = await dbGet(
        'SELECT full_name, phone, avatar_url, email FROM users WHERE id = ?',
        [ride.driver_id]
      );
      const driverProfile = await dbGet(
        'SELECT rating, verification_status, license_number FROM drivers WHERE id = ?',
        [ride.driver_id]
      );
      const vehicle = await dbGet(
        'SELECT make, model, year, color, license_plate, vehicle_type FROM vehicles WHERE driver_id = ? AND is_active = 1',
        [ride.driver_id]
      );

      if (driverUser) {
        driver = {
          ...driverProfile,
          profile: driverUser,
          vehicle: vehicle || null
        };
      }
    }

    return {
      ...ride,
      rider: rider || null,
      driver: driver || null
    };
  },

  async findActiveByRiderId(riderId) {
    return dbGet(
      `SELECT id FROM rides 
       WHERE rider_id = ? AND status IN ('searching', 'accepted', 'arriving', 'in_progress')
       ORDER BY created_at DESC LIMIT 1`,
      [riderId]
    );
  },

  async findActiveByDriverId(driverId) {
    return dbGet(
      `SELECT id FROM rides 
       WHERE driver_id = ? AND status IN ('accepted', 'arriving', 'in_progress')
       ORDER BY created_at DESC LIMIT 1`,
      [driverId]
    );
  },

  async create(rideData) {
    const {
      id,
      rider_id,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      dropoff_address,
      dropoff_latitude,
      dropoff_longitude,
      fare,
      distance,
      duration,
      payment_method = 'cash',
      payment_status = 'pending',
      status = 'searching',
      otp
    } = rideData;

    await dbRun(
      `INSERT INTO rides (
        id, rider_id, pickup_address, pickup_latitude, pickup_longitude,
        dropoff_address, dropoff_latitude, dropoff_longitude,
        fare, distance, duration, payment_method, payment_status, status, otp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, rider_id, pickup_address, pickup_latitude, pickup_longitude,
        dropoff_address, dropoff_latitude, dropoff_longitude,
        fare, distance, duration, payment_method, payment_status, status, otp
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

    const sql = `UPDATE rides SET ${fields.join(', ')} WHERE id = ?`;
    await dbRun(sql, values);

    return this.findById(id);
  },

  async getHistory(userId, role) {
    if (role === 'rider') {
      return dbAll('SELECT * FROM rides WHERE rider_id = ? ORDER BY created_at DESC', [userId]);
    } else {
      return dbAll('SELECT * FROM rides WHERE driver_id = ? ORDER BY created_at DESC', [userId]);
    }
  },

  async getAll() {
    return dbAll('SELECT * FROM rides ORDER BY created_at DESC');
  }
};
