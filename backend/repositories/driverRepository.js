// backend/repositories/driverRepository.js
// All SQL for driver operations — uses actual schema:
// profiles, driver_profiles, vehicles, driver_live_location, driver_documents, vehicle_documents

import db from '../config/db.js';

export const DriverRepository = {
  // Get full driver profile (profile + driver_profiles + vehicle)
  async findById(profileId) {
    const [rows] = await db.execute(
      `SELECT p.id, p.username, p.full_name, p.phone, p.email, p.profile_image,
              dp.profile_photo, dp.driving_licence_image, dp.driving_licence_number,
              COALESCE(dp.profile_photo, p.profile_image) AS profile_photo_url,
              p.account_status, p.phone_verified,
              dp.id AS driver_id, dp.driver_code, dp.license_number, dp.license_expiry,
              dp.experience_years, dp.vehicle_type, dp.total_rides, dp.completed_rides,
              dp.cancelled_rides, dp.total_earnings, dp.rating,
              dp.verification_status, dp.is_online, dp.is_banned, dp.rejection_reason,
              v.id AS vehicle_id, v.vehicle_number, v.vehicle_brand, v.vehicle_model,
              v.vehicle_color, v.manufacturing_year, v.seating_capacity, v.fuel_type,
              v.verification_status AS vehicle_status
       FROM profiles p
       JOIN driver_profiles dp ON p.id = dp.profile_id
       LEFT JOIN vehicles v ON dp.id = v.driver_id AND v.is_active = 1
       WHERE p.id = ? LIMIT 1`,
      [profileId]
    );
    return rows[0] || null;
  },

  async findByDriverId(driverId) {
    const [rows] = await db.execute(
      `SELECT p.id AS profile_id, p.full_name, p.phone, p.email, p.profile_image,
              dp.*,
              v.id AS vehicle_id, v.vehicle_number, v.vehicle_brand, v.vehicle_model
       FROM driver_profiles dp
       JOIN profiles p ON dp.profile_id = p.id
       LEFT JOIN vehicles v ON dp.id = v.driver_id AND v.is_active = 1
       WHERE dp.id = ? LIMIT 1`,
      [driverId]
    );
    return rows[0] || null;
  },

  async createDriverProfile(data) {
    const { profileId, driverCode, email, licenseNumber, licenseExpiry, experienceYears, vehicleType } = data;
    const [result] = await db.execute(
      `INSERT INTO driver_profiles (profile_id, driver_code, email, license_number, license_expiry, experience_years, vehicle_type, verification_status, is_online, is_banned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 0, 0, NOW(), NOW())`,
      [profileId, driverCode, email, licenseNumber, licenseExpiry || null, experienceYears || 0, vehicleType || 'Car']
    );
    return result.insertId;
  },

  // Set driver online/offline
  async setOnlineStatus(profileId, isOnline) {
    if (isOnline) {
      const [dp] = await db.execute(`SELECT verification_status FROM driver_profiles WHERE profile_id = ?`, [profileId]);
      const status = (dp[0]?.verification_status || '').toLowerCase();
      if (!dp[0] || (status !== 'verified' && status !== 'approved')) {
        throw new Error('Verification is pending or rejected. Driver cannot go online.');
      }
    }
    await db.execute(
      `UPDATE driver_profiles SET is_online = ?, updated_at = NOW() WHERE profile_id = ?`,
      [isOnline ? 1 : 0, profileId]
    );
  },

  // Update full live location + status — driver_live_location.driver_id = driver_profiles.id (INT)
  async updateLocation(profileId, latitude, longitude, heading = 0, speed = 0, accuracy = 0, batteryPct = null, networkType = null, currentRideId = null) {
    const [dpRows] = await db.execute(`SELECT id FROM driver_profiles WHERE profile_id = ? LIMIT 1`, [profileId]);
    if (!dpRows[0]) return;
    const driverId = dpRows[0].id;

    // Upsert live location with all available telemetry fields
    await db.execute(
      `INSERT INTO driver_live_location (driver_id, latitude, longitude, heading, speed, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         heading = VALUES(heading),
         speed = VALUES(speed),
         updated_at = NOW()`,
      [driverId, latitude, longitude, heading, speed]
    );

    // Append to ride_tracking history if there is an active ride
    if (currentRideId) {
      await db.execute(
        `INSERT INTO ride_tracking (ride_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [currentRideId, driverId, latitude, longitude, speed, heading, accuracy]
      ).catch(() => {}); // non-blocking
    }
  },

  // Get location
  async getLocation(profileId) {
    const [rows] = await db.execute(
      `SELECT dll.latitude, dll.longitude, dll.updated_at
       FROM driver_live_location dll
       JOIN driver_profiles dp ON dll.driver_id = dp.id
       WHERE dp.profile_id = ? LIMIT 1`,
      [profileId]
    );
    return rows[0] || null;
  },

  // Find nearby online drivers (within radius km using Haversine)
  async findNearbyDrivers(latitude, longitude, radiusKm = 10, vehicleType = null) {
    let sql = `
      SELECT p.id AS profile_id, p.full_name, p.phone, p.profile_image,
             dp.id AS driver_id, dp.rating, dp.vehicle_type,
             dll.latitude, dll.longitude,
             v.vehicle_number, v.vehicle_brand, v.vehicle_model, v.vehicle_color,
             ( 6371 * ACOS( COS(RADIANS(?)) * COS(RADIANS(dll.latitude))
               * COS(RADIANS(dll.longitude) - RADIANS(?))
               + SIN(RADIANS(?)) * SIN(RADIANS(dll.latitude)) ) ) AS distance_km
      FROM driver_live_location dll
      JOIN driver_profiles dp ON dll.driver_id = dp.id
      JOIN profiles p ON dp.profile_id = p.id
      LEFT JOIN vehicles v ON dp.id = v.driver_id AND v.is_active = 1
      WHERE dp.is_online = 1
        AND LOWER(dp.verification_status) IN ('verified', 'approved')
        AND p.account_status = 'active'`;

    const params = [latitude, longitude, latitude];

    if (vehicleType) {
      sql += ` AND dp.vehicle_type = ?`;
      params.push(vehicleType);
    }

    sql += `
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT 20`;
    params.push(radiusKm);

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async setVerificationStatus(driverId, status, verifiedBy = null, rejectionReason = null) {
    if (!status || typeof status !== 'string') {
      throw new Error('Verification status is required.');
    }
    const lower = status.trim().toLowerCase();
    const validStatuses = ['pending', 'verified', 'approved', 'rejected'];
    
    if (!validStatuses.includes(lower)) {
      throw new Error(`Invalid verification status "${status}". Allowed values: pending, verified, rejected.`);
    }

    // Prepare ordered candidate values to try against MySQL ENUM / VARCHAR schema
    let candidateValues = [status];
    if (lower === 'verified' || lower === 'approved') {
      candidateValues = ['Approved', 'Verified', 'approved', 'verified'];
    } else if (lower === 'pending') {
      candidateValues = ['Pending', 'pending'];
    } else if (lower === 'rejected') {
      candidateValues = ['Rejected', 'rejected'];
    }

    let lastErr = null;
    for (const targetVal of candidateValues) {
      try {
        await db.execute(
          `UPDATE driver_profiles 
           SET verification_status = ?, 
               verification_date = NOW(), 
               verified_by = ?, 
               rejection_reason = ?, 
               updated_at = NOW() 
           WHERE id = ?`,
          [targetVal, verifiedBy, rejectionReason, driverId]
        );
        return; // Success! Exit function immediately
      } catch (err) {
        lastErr = err;
        if (err.message.includes('Data truncated') || err.message.includes('TRUNCATED') || err.code === 'WARN_DATA_TRUNCATED' || err.errno === 1265) {
          console.warn(`[driverRepository] Status value "${targetVal}" truncated by MySQL schema. Trying fallback candidate...`);
          continue;
        }
        throw err;
      }
    }
    if (lastErr) throw lastErr;
  },

  async setBanStatus(driverId, banned) {
    // Deprecated - Ban Driver option completely removed
    return true;
  },

  async incrementRideStats(driverId, completed = false, cancelled = false) {
    let sql = `UPDATE driver_profiles SET total_rides = total_rides + 1`;
    if (completed) sql += `, completed_rides = completed_rides + 1`;
    if (cancelled) sql += `, cancelled_rides = cancelled_rides + 1`;
    sql += ` WHERE id = ?`;
    await db.execute(sql, [driverId]);
  },

  async updateEarnings(driverId, amount) {
    await db.execute(
      `UPDATE driver_profiles SET total_earnings = total_earnings + ? WHERE id = ?`,
      [amount, driverId]
    );
  },

  async updateRating(driverId, newRating) {
    await db.execute(
      `UPDATE driver_profiles SET rating = ? WHERE id = ?`,
      [newRating, driverId]
    );
  },
};

export default DriverRepository;
