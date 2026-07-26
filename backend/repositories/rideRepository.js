// backend/repositories/rideRepository.js
// All SQL for ride lifecycle — uses actual schema:
// rides, ride_otp, ride_locations, ride_status_history, ride_fare_breakdown

import db from '../config/db.js';

export const RideRepository = {
  async create(data) {
    const {
      ride_code, rider_id, ride_type = 'Car',
      payment_method = 'Cash',
      pickup_address, pickup_latitude, pickup_longitude,
      dropoff_address, dropoff_latitude, dropoff_longitude,
      estimated_distance = 0, estimated_duration = 0, estimated_fare = 0,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO rides (ride_code, rider_id, ride_type, payment_method, ride_status,
                          payment_status, estimated_distance, estimated_duration, estimated_fare, booking_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Searching', 'Pending', ?, ?, ?, NOW(), NOW(), NOW())`,
      [ride_code, rider_id, ride_type, payment_method,
       estimated_distance, estimated_duration, estimated_fare]
    );
    const rideId = result.insertId;

    // Store pickup/dropoff as ride_locations entry
    await db.execute(
      `INSERT INTO ride_locations (ride_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [rideId, pickup_address || '', pickup_latitude || 0, pickup_longitude || 0,
       dropoff_address || '', dropoff_latitude || 0, dropoff_longitude || 0]
    );

    return rideId;
  },

  async findById(rideId) {
    const [rows] = await db.execute(
      `SELECT r.*,
              rl.pickup_address, rl.pickup_lat AS pickup_latitude, rl.pickup_lng AS pickup_longitude,
              rl.drop_address AS dropoff_address, rl.drop_lat AS dropoff_latitude, rl.drop_lng AS dropoff_longitude,
              p.full_name AS rider_name, p.phone AS rider_phone,
              dp_p.full_name AS driver_name, dp_p.phone AS driver_phone,
              dp.rating AS driver_rating, dp.driver_code,
              v.vehicle_number, v.vehicle_brand, v.vehicle_model, v.vehicle_color,
              ro.otp AS ride_otp, ro.is_verified AS otp_verified
       FROM rides r
       LEFT JOIN profiles p ON r.rider_id = p.id
       LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
       LEFT JOIN profiles dp_p ON dp.profile_id = dp_p.id
       LEFT JOIN vehicles v ON r.vehicle_id = v.id
       LEFT JOIN ride_locations rl ON r.id = rl.ride_id
       LEFT JOIN ride_otp ro ON r.id = ro.ride_id
       WHERE r.id = ? LIMIT 1`,
      [rideId]
    );
    return rows[0] || null;
  },

  async findByCode(rideCode) {
    const [rows] = await db.execute(
      `SELECT id FROM rides WHERE ride_code = ? LIMIT 1`,
      [rideCode]
    );
    return rows[0] || null;
  },

  async updateStatus(rideId, status, extraFields = {}) {
    let targetStatus = status;
    if (status === 'Completed' || status === 'completed') targetStatus = 'Ride Completed';

    const validStatuses = [
      'Searching', 'Driver Assigned', 'Driver Accepted', 'Driver Arriving',
      'Driver Arrived', 'OTP Verified', 'Ride Started', 'Ride Completed', 'Cancelled'
    ];
    if (!validStatuses.includes(targetStatus)) {
      targetStatus = 'Ride Completed';
    }

    const timeField = {
      'Driver Accepted': 'accepted_time',
      'Driver Arrived': 'arrived_time',
      'OTP Verified': null,
      'Ride Started': 'started_time',
      'Ride Completed': 'completed_time',
      'Cancelled': 'cancelled_time',
    };

    let sql = `UPDATE rides SET ride_status = ?, updated_at = NOW()`;
    const params = [targetStatus];

    const tf = timeField[targetStatus];
    if (tf) { sql += `, ${tf} = NOW()`; }

    for (let [key, val] of Object.entries(extraFields)) {
      if (key === 'payment_status') {
        const strVal = String(val).toLowerCase();
        if (strVal === 'paid' || strVal === 'completed' || strVal === 'success') val = 'Paid';
        else if (strVal === 'failed') val = 'Failed';
        else val = 'Pending';
      }
      sql += `, ${key} = ?`;
      params.push(val);
    }

    sql += ` WHERE id = ?`;
    params.push(rideId);
    await db.execute(sql, params);

    // Log status history
    try {
      await db.execute(
        `INSERT INTO ride_status_history (ride_id, ride_status, created_at) VALUES (?, ?, NOW())`,
        [rideId, targetStatus]
      );
    } catch (e) {}
  },

  async assignDriver(rideId, driverId, vehicleId) {
    await db.execute(
      `UPDATE rides SET driver_id = ?, vehicle_id = ?, ride_status = 'Driver Assigned',
              accepted_time = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [driverId, vehicleId, rideId]
    );
    await db.execute(
      `INSERT INTO ride_status_history (ride_id, status, changed_at) VALUES (?, 'Driver Assigned', NOW())`,
      [rideId]
    );
  },

  async setOtp(rideId, otp) {
    await db.execute(
      `INSERT INTO ride_otp (ride_id, otp, is_verified, generated_at)
       VALUES (?, ?, 0, NOW())
       ON DUPLICATE KEY UPDATE otp = ?, is_verified = 0, generated_at = NOW()`,
      [rideId, otp, otp]
    );
  },

  async verifyOtp(rideId, otp) {
    const [rows] = await db.execute(
      `SELECT id FROM ride_otp WHERE ride_id = ? AND otp = ? AND is_verified = 0 LIMIT 1`,
      [rideId, otp]
    );
    if (rows[0]) {
      await db.execute(
        `UPDATE ride_otp SET is_verified = 1, verified_at = NOW() WHERE ride_id = ?`,
        [rideId]
      );
      return true;
    }
    return false;
  },

  async saveFareBreakdown(rideId, fareData) {
    const { base_fare, distance_fare, time_fare, tax, discount, surge, final_fare, commission, driver_earnings } = fareData;
    await db.execute(
      `INSERT INTO ride_fare_breakdown (ride_id, base_fare, distance_fare, time_fare, tax, discount, surge, final_fare, commission, driver_earnings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE final_fare = ?, updated_at = NOW()`,
      [rideId, base_fare||0, distance_fare||0, time_fare||0, tax||0, discount||0, surge||0, final_fare||0, commission||0, driver_earnings||0, final_fare||0]
    );
  },

  async getRidesByRider(riderId, { limit = 10, offset = 0, status = null } = {}) {
    let sql = `SELECT r.id, r.ride_code, r.ride_status, r.final_fare, r.payment_method,
                      r.payment_status, r.booking_time, r.completed_time,
                      rl.pickup_address, rl.drop_address AS dropoff_address,
                      dp_p.full_name AS driver_name
               FROM rides r
               LEFT JOIN ride_locations rl ON r.id = rl.ride_id
               LEFT JOIN driver_profiles dp ON r.driver_id = dp.id
               LEFT JOIN profiles dp_p ON dp.profile_id = dp_p.id
               WHERE r.rider_id = ?`;
    const params = [riderId];
    if (status) { sql += ` AND r.ride_status = ?`; params.push(status); }
    sql += ` ORDER BY r.booking_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async countRidesByRider(riderId, status = null) {
    let sql = `SELECT COUNT(*) AS total FROM rides WHERE rider_id = ?`;
    const params = [riderId];
    if (status) { sql += ` AND ride_status = ?`; params.push(status); }
    const [[row]] = await db.execute(sql, params);
    return row.total;
  },

  async getActiveRideForRider(riderId) {
    const activeStatuses = `'Searching','Driver Assigned','Driver Accepted','Driver Arrived','OTP Verified','Ride Started'`;
    const [rows] = await db.execute(
      `SELECT id, ride_code, ride_status, driver_id FROM rides
       WHERE rider_id = ? AND ride_status IN (${activeStatuses}) LIMIT 1`,
      [riderId]
    );
    return rows[0] || null;
  },

  async getActiveRideForDriver(driverId) {
    const [rows] = await db.execute(
      `SELECT id, ride_code, ride_status, rider_id FROM rides
       WHERE driver_id = ? AND ride_status IN ('Driver Accepted','Driver Arrived','OTP Verified','Ride Started') LIMIT 1`,
      [driverId]
    );
    return rows[0] || null;
  },
};

export default RideRepository;
