// backend/repositories/queryRepository.js
// Supabase compatibility layer mapping dynamic client queries to correct MySQL tables/columns.

import db from '../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const tableMap = {
  profiles: 'profiles',
  driver_profiles: 'driver_profiles',
  vehicles: 'vehicles',
  rides: 'rides',
  wallets: 'wallets',
  wallet_transactions: 'wallet_transactions',
  platform_settings: 'app_settings',
  favourite_locations: 'favourite_locations',
  recent_locations: 'recent_locations',
  ratings: 'ratings',
  waste: 'waste',
  driver_reviews: 'driver_reviews'
};

const querySetups = {
  profiles: {
    baseSql: `SELECT id, firebase_uid, username, password_hash, full_name, phone, email, role, phone_verified, date_of_birth AS dob, date_of_birth, gender, referral_code, address, profile_image AS avatar_url, last_login, created_at, updated_at FROM profiles`,
    columnMap: {
      avatar_url: 'profile_image',
      dob: 'date_of_birth'
    }
  },
  driver_profiles: {
    baseSql: `SELECT dp.profile_id AS id, dp.online_seconds AS online_seconds, IF(dp.is_online = 1, 'online', 'offline') AS status, dp.rating, dp.verification_status, dll.latitude AS current_latitude, dll.longitude AS current_longitude, dll.updated_at AS last_active_at, dp.created_at, dp.email, dp.license_number, dp.license_expiry, dd.license_photo AS license_image_url, dd.rc_book_photo AS rc_book_url, dd.insurance_photo AS insurance_url, dd.profile_photo AS profile_photo_url, dd.selfie_photo AS selfie_url, p.full_name AS full_name FROM driver_profiles dp LEFT JOIN driver_live_location dll ON dll.driver_id = dp.id LEFT JOIN driver_documents dd ON dd.driver_id = dp.id LEFT JOIN profiles p ON dp.profile_id = p.id`,
    columnMap: {
      id: 'dp.profile_id',
      status: 'dp.is_online',
      verification_status: 'dp.verification_status',
      license_image_url: 'dd.license_photo',
      rc_book_url: 'dd.rc_book_photo',
      insurance_url: 'dd.insurance_photo',
      profile_photo_url: 'dd.profile_photo',
      selfie_url: 'dd.selfie_photo'
    }
  },
  vehicles: {
    baseSql: `SELECT vehicles.id, dp.profile_id AS driver_id, vehicles.vehicle_brand AS make, vehicles.vehicle_model AS model, vehicles.manufacturing_year AS year, vehicles.vehicle_color AS color, vehicles.vehicle_number AS license_plate, vehicles.is_active FROM vehicles LEFT JOIN driver_profiles dp ON vehicles.driver_id = dp.id`,
    columnMap: {
      driver_id: 'dp.profile_id',
      make: 'vehicles.vehicle_brand',
      model: 'vehicles.vehicle_model',
      year: 'vehicles.manufacturing_year',
      color: 'vehicles.vehicle_color',
      license_plate: 'vehicles.vehicle_number'
    }
  },
  rides: {
    baseSql: `SELECT rides.id, rides.ride_code, rides.rider_id, dp.profile_id AS driver_id, rides.vehicle_id, rides.ride_type, rides.ride_status AS status, rides.payment_method, rides.payment_status, rides.estimated_distance AS distance, rides.estimated_duration AS duration, rides.estimated_fare AS fare, rl.pickup_address, rl.pickup_lat AS pickup_latitude, rl.pickup_lng AS pickup_longitude, rl.drop_address AS dropoff_address, rl.drop_lat AS dropoff_latitude, rl.drop_lng AS dropoff_longitude, rides.booking_time AS created_at, rides.accepted_time AS accepted_at, rides.started_time AS started_at, rides.completed_time AS completed_at, rides.cancelled_time AS cancelled_at, ro.otp AS otp, p_rider.full_name AS rider_name, p_rider.phone AS rider_phone, p_rider.profile_image AS rider_avatar, p_driver.full_name AS driver_name, p_driver.phone AS driver_phone FROM rides LEFT JOIN driver_profiles dp ON rides.driver_id = dp.id LEFT JOIN ride_locations rl ON rides.id = rl.ride_id LEFT JOIN ride_otp ro ON rides.id = ro.ride_id LEFT JOIN profiles p_rider ON rides.rider_id = p_rider.id LEFT JOIN profiles p_driver ON dp.profile_id = p_driver.id`,
    columnMap: {
      id: 'rides.id',
      rider_id: 'rides.rider_id',
      driver_id: 'dp.profile_id',
      status: 'rides.ride_status',
      pickup_latitude: 'rl.pickup_lat',
      pickup_longitude: 'rl.pickup_lng',
      dropoff_latitude: 'rl.drop_lat',
      dropoff_longitude: 'rl.drop_lng',
      pickup_address: 'rl.pickup_address',
      dropoff_address: 'rl.drop_address',
      created_at: 'rides.booking_time'
    }
  },
  wallets: {
    baseSql: `SELECT id, profile_id AS id, wallet_balance AS balance, created_at, updated_at FROM wallets`,
    columnMap: {
      id: 'profile_id'
    }
  },
  wallet_transactions: {
    baseSql: `SELECT wallet_transactions.id, w.profile_id AS wallet_id, wallet_transactions.amount, LOWER(wallet_transactions.transaction_type) AS type, wallet_transactions.description, wallet_transactions.transaction_date AS created_at FROM wallet_transactions LEFT JOIN wallets w ON wallet_transactions.wallet_id = w.id`,
    columnMap: {
      wallet_id: 'w.profile_id',
      created_at: 'wallet_transactions.transaction_date'
    }
  },
  platform_settings: {
    baseSql: `SELECT setting_key AS \`key\`, setting_value AS \`value\` FROM app_settings`,
    columnMap: {
      key: 'setting_key'
    }
  },
  ratings: {
    baseSql: `SELECT r.id, r.ride_id, r.rider_id AS rater_id, dp.profile_id AS ratee_id, r.rating, r.review AS comment, r.created_at FROM ratings r LEFT JOIN driver_profiles dp ON r.driver_id = dp.id`,
    columnMap: {
      id: 'r.id',
      ride_id: 'r.ride_id',
      rater_id: 'r.rider_id',
      ratee_id: 'dp.profile_id',
      comment: 'r.review',
      created_at: 'r.created_at'
    }
  },
  waste: {
    baseSql: `SELECT id, username, full_name, phone, email, role FROM waste`,
    columnMap: {}
  },
  ride_chats: {
    baseSql: `SELECT id, ride_id, sender_id, message, created_at FROM ride_chats`,
    columnMap: {}
  },
  driver_reviews: {
    baseSql: `SELECT id, driver_id, rider_id, rating, comment, created_at FROM driver_reviews`,
    columnMap: {}
  }
};

const mapStatusToMySQL = (val) => {
  const statusMap = {
    searching: 'Searching',
    accepted: 'Driver Accepted',
    arriving: 'Driver Arrived',
    in_progress: 'Ride Started',
    completed: 'Ride Completed',
    cancelled: 'Cancelled'
  };
  return statusMap[val] || val;
};

const mapStatusToFrontend = (val) => {
  const statusMap = {
    'Searching': 'searching',
    'Driver Assigned': 'accepted',
    'Driver Accepted': 'accepted',
    'Driver Arrived': 'arriving',
    'OTP Verified': 'in_progress',
    'Ride Started': 'in_progress',
    'Ride Completed': 'completed',
    'Cancelled': 'cancelled'
  };
  return statusMap[val] || val;
};

const mapTxTypeToMySQL = (val) => {
  const typeMap = {
    deposit: 'Credit',
    withdrawal: 'Debit',
    ride_payment: 'Debit',
    ride_earnings: 'Credit',
    refund: 'Credit'
  };
  return typeMap[val] || val;
};

const mapRideTypeToMySQL = (val) => {
  const normalized = (val || '').toLowerCase();
  if (normalized === 'bike') return 'Bike';
  if (normalized === 'auto') return 'Auto';
  if (normalized === 'mini') return 'Mini';
  if (normalized === 'suv') return 'SUV';
  return 'Sedan'; // Default/fallback for 'Car', 'taxi', etc.
};

const mapVerificationStatusToMySQL = (val) => {
  if (!val) return 'Pending';
  const lower = val.toLowerCase();
  if (lower === 'approved') return 'Approved';
  if (lower === 'rejected') return 'Rejected';
  return 'Pending';
};

const mapVerificationStatusToFrontend = (val) => {
  if (!val) return 'pending';
  return val.toLowerCase();
};


export const QueryRepository = {
  async executeDynamicQuery(params) {
    const {
      table,
      action = 'select',
      payload,
      select = '*',
      filters = [],
      order,
      limit,
      single = false,
      maybeSingle = false,
    } = params;

    const mappedTable = tableMap[table] || table;
    const setup = querySetups[table];

    if (table === 'ride_chats') {
      await db.query(`
        CREATE TABLE IF NOT EXISTS \`ride_chats\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`ride_id\` VARCHAR(50) NOT NULL,
          \`sender_id\` VARCHAR(50) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `).catch(() => {});
    }

    if (action === 'select') {
      const passFilter = filters.find(f => f.column === 'password_hash' && f.operator === 'eq');
      const userFilter = filters.find(f => (f.column === 'username' || f.column === 'email' || f.column === 'phone' || f.column === 'id') && f.operator === 'eq');

      // Login Verification
      if (table === 'profiles' && passFilter && userFilter) {
        const usernameVal = userFilter.value;
        const passVal = passFilter.value;
        const usernameStr = String(usernameVal || '');

        // Ensure waste table exists
        await db.query(`
          CREATE TABLE IF NOT EXISTS \`waste\` (
            \`id\` CHAR(36) NOT NULL,
            \`firebase_uid\` VARCHAR(128) DEFAULT NULL,
            \`username\` VARCHAR(50) DEFAULT NULL,
            \`password_hash\` VARCHAR(255) DEFAULT NULL,
            \`full_name\` VARCHAR(100) DEFAULT NULL,
            \`phone\` VARCHAR(20) DEFAULT NULL,
            \`email\` VARCHAR(100) DEFAULT NULL,
            \`role\` VARCHAR(20) DEFAULT 'rider',
            \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `).catch(() => {});

        const [users] = await db.query(
          'SELECT * FROM profiles WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR REPLACE(phone, \' \', \'\') = REPLACE(?, \' \', \'\') OR id = ?',
          [usernameStr.toLowerCase(), usernameStr.toLowerCase(), usernameStr, usernameStr]
        );
        const user = users[0];

        if (!user) {
          const [deleted] = await db.query(
            'SELECT * FROM waste WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR REPLACE(phone, \' \', \'\') = REPLACE(?, \' \', \'\') OR id = ?',
            [usernameStr.toLowerCase(), usernameStr.toLowerCase(), usernameStr, usernameStr]
          );
          if (deleted.length > 0) {
            return { data: null, error: { message: 'This account was deleted.' } };
          }
          return { data: null, error: { message: 'Invalid username or password.' } };
        }

        const isMatch = await bcrypt.compare(passVal, user.password_hash);
        if (!isMatch) {
          return { data: null, error: { message: 'Invalid username or password.' } };
        }

        // Validate account role restrictions
        const roleFilter = filters.find(f => f.column === 'role' && f.operator === 'eq');
        if (roleFilter) {
          const expectedRole = roleFilter.value;
          if (user.role !== expectedRole) {
            let errorMsg = 'Invalid account type for this login.';
            if (user.role === 'rider') {
              errorMsg = 'This account is registered as a Rider. Please use the Rider Login page.';
            } else if (user.role === 'driver') {
              errorMsg = 'This account is registered as a Driver. Please use the Driver Login page.';
            }
            return { data: null, error: { message: errorMsg } };
          }
        }

        const returnUser = { ...user };
        returnUser.avatar_url = user.profile_image;
        returnUser.dob = user.date_of_birth;
        delete returnUser.password_hash;

        return { data: (single || maybeSingle) ? returnUser : [returnUser], error: null };
      }

      // SELECT Query Builder
      let sql = setup ? setup.baseSql : `SELECT * FROM \`${mappedTable}\``;
      const queryParams = [];
      const whereClauses = [];

      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          let col = filter.column;
          const op = filter.operator;
          let val = filter.value;

          if (setup && setup.columnMap[col]) {
            col = setup.columnMap[col];
          }

          if (table === 'rides' && filter.column === 'status') {
            if (Array.isArray(val)) {
              val = val.map(v => mapStatusToMySQL(v));
            } else {
              val = mapStatusToMySQL(val);
            }
          }
          if (table === 'wallet_transactions' && filter.column === 'type') {
            val = mapTxTypeToMySQL(val);
          }
          if (table === 'driver_profiles' && filter.column === 'status') {
            val = val === 'online' ? 1 : 0;
          }
          if (table === 'driver_profiles' && filter.column === 'verification_status') {
            val = mapVerificationStatusToMySQL(val);
          }

          if (op === 'eq') {
            if (col === 'phone') {
              whereClauses.push(`REPLACE(phone, ' ', '') = REPLACE(?, ' ', '')`);
              queryParams.push(val);
            } else {
              whereClauses.push(`${col} = ?`);
              queryParams.push(val);
            }
          } else if (op === 'gte') {
            whereClauses.push(`${col} >= ?`);
            queryParams.push(val);
          } else if (op === 'in') {
            if (Array.isArray(val) && val.length > 0) {
              const placeholders = val.map(() => '?').join(', ');
              whereClauses.push(`${col} IN (${placeholders})`);
              queryParams.push(...val);
            }
          }
        });
      }

      if (whereClauses.length > 0) {
        if (setup && setup.baseSql.includes(' WHERE ')) {
          sql += ` AND ${whereClauses.join(' AND ')}`;
        } else {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      if (order && order.column) {
        let orderCol = order.column;
        if (setup && setup.columnMap[orderCol]) {
          orderCol = setup.columnMap[orderCol];
        }
        sql += ` ORDER BY ${orderCol} ${order.ascending ? 'ASC' : 'DESC'}`;
      }

      if (limit !== undefined && limit !== null) {
        sql += ` LIMIT ?`;
        queryParams.push(limit);
      }

      const [rows] = await db.query(sql, queryParams);

      // Map rows status and types back to frontend format
      for (const row of rows) {
        if (table === 'rides') {
          if (row.status !== undefined) {
            row.status = mapStatusToFrontend(row.status);
          }
          row.rider = {
            full_name: row.rider_name || 'Passenger',
            phone: row.rider_phone || '',
            avatar_url: row.rider_avatar || ''
          };
          row.driver = {
            full_name: row.driver_name || 'Driver',
            phone: row.driver_phone || ''
          };
          row.otp = row.otp || '';
        }
        if (row.type !== undefined && table === 'wallet_transactions') {
          if (row.type === 'credit') row.type = 'deposit';
          if (row.type === 'debit') row.type = 'ride_payment';
        }
        if (row.verification_status !== undefined && table === 'driver_profiles') {
          row.verification_status = mapVerificationStatusToFrontend(row.verification_status);
          row.profile = {
            full_name: row.full_name || 'Driver'
          };
          // Look up images from MongoDB
          try {
            const { MongoService } = await import('../services/mongoService.js');
            const docs = await MongoService.getDriverDocuments(row.id);
            if (docs) {
              if (docs.profile_photo_url) row.profile_photo_url = docs.profile_photo_url;
              if (docs.license_image_url) row.license_image_url = docs.license_image_url;
            }
          } catch (err) {
            console.error('[queryRepository] MongoDB document load failed:', err.message);
          }
        }
      }

      const isCountOnly = select === '*' && params.options?.count;
      if (isCountOnly) {
        return { data: null, count: rows.length, error: null };
      }

      if (single) {
        if (rows.length === 0) {
          return { data: null, error: { message: 'Row not found' } };
        }
        return { data: rows[0], error: null };
      }

      if (maybeSingle) {
        return { data: rows.length > 0 ? rows[0] : null, error: null };
      }

      return { data: rows, error: null };
    }

    if (action === 'insert') {
      const rawPayload = Array.isArray(payload) ? payload : [payload];
      const insertedRows = [];

      for (const row of rawPayload) {
        if (table === 'profiles') {
          const insertId = row.id || crypto.randomUUID();
          const pHash = row.password_hash ? await bcrypt.hash(row.password_hash, 10) : null;
          
          // Ensure username is unique to avoid MySQL duplicate key constraints
          let uniqueUsername = row.username || `user_${Math.floor(100000 + Math.random() * 900000)}`;
          let isUnique = false;
          let attempt = 0;
          while (!isUnique && attempt < 10) {
            const [[existing]] = await db.query('SELECT COUNT(*) AS count FROM profiles WHERE username = ?', [uniqueUsername]);
            if (existing.count === 0) {
              isUnique = true;
            } else {
              attempt++;
              uniqueUsername = `${row.username || 'user'}_${Math.floor(1000 + Math.random() * 9000)}`;
            }
          }

          await db.query(
            `INSERT INTO profiles (id, firebase_uid, username, password_hash, full_name, phone, email, role, date_of_birth, gender, profile_image, referral_code, account_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
            [insertId, row.firebase_uid || null, uniqueUsername, pHash, row.full_name, row.phone, row.email, row.role || 'rider', row.dob || null, row.gender || null, row.avatar_url || null, row.referral_code || null]
          );
          // Auto wallet creation
          await db.query('INSERT IGNORE INTO wallets (profile_id, wallet_balance, wallet_status, created_at, updated_at) VALUES (?, 0.00, \'Active\', NOW(), NOW())', [insertId]);
          const [[newProfile]] = await db.query('SELECT *, profile_image AS avatar_url, date_of_birth AS dob FROM profiles WHERE id = ?', [insertId]);
          insertedRows.push(newProfile);
        }
        else if (table === 'driver_profiles') {
          const driverCode = 'DRV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
          const [result] = await db.query(
            `INSERT INTO driver_profiles (profile_id, driver_code, is_online, rating, verification_status, email, license_number, license_expiry, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [row.id, driverCode, row.status === 'online' ? 1 : 0, row.rating || 5.0, mapVerificationStatusToMySQL(row.verification_status || 'Pending'), row.email || null, row.license_number || null, row.license_expiry || null]
          );
          const driverIntId = result.insertId;

          // Insert document URLs into driver_documents
          await db.query(
            `INSERT INTO driver_documents (driver_id, profile_photo, selfie_photo, license_photo, rc_book_photo, insurance_photo, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [driverIntId, row.profile_photo_url || null, row.selfie_url || null, row.license_image_url || null, row.rc_book_url || null, row.insurance_url || null]
          );

          // Save to MongoDB
          try {
            const { MongoService } = await import('../services/mongoService.js');
            if (row.profile_photo_url) {
              await MongoService.saveDriverDocument(row.id, 'profile_photo_url', row.profile_photo_url);
            }
            if (row.license_image_url) {
              await MongoService.saveDriverDocument(row.id, 'license_image_url', row.license_image_url);
            }
          } catch (err) {
            console.error('[queryRepository] MongoDB save failed:', err.message);
          }

          // Sync profile_image in profiles table with the driver's profile photo
          if (row.profile_photo_url) {
            await db.query('UPDATE profiles SET profile_image = ? WHERE id = ?', [row.profile_photo_url, row.id]);
          }

          const [[newDp]] = await db.query(
            `SELECT dp.profile_id AS id, IF(dp.is_online = 1, 'online', 'offline') AS status, dp.rating, dp.verification_status, dd.license_photo AS license_image_url, dd.rc_book_photo AS rc_book_url, dd.insurance_photo AS insurance_url, dd.profile_photo AS profile_photo_url, dd.selfie_photo AS selfie_url
             FROM driver_profiles dp LEFT JOIN driver_documents dd ON dd.driver_id = dp.id WHERE dp.profile_id = ?`,
            [row.id]
          );
          insertedRows.push(newDp);
        }
        else if (table === 'vehicles') {
          // Find driver_profiles.id integer from profile_id UUID
          const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [row.driver_id]);
          const driverIntId = dp?.id || 1;

          // Ensure vehicle_number (license_plate) is unique
          let uniquePlate = row.license_plate || `TN-${Math.floor(10 + Math.random() * 89)}-XX-${Math.floor(1000 + Math.random() * 9000)}`;
          let isUnique = false;
          let attempt = 0;
          while (!isUnique && attempt < 10) {
            const [[existing]] = await db.query('SELECT COUNT(*) AS count FROM vehicles WHERE vehicle_number = ?', [uniquePlate]);
            if (existing.count === 0) {
              isUnique = true;
            } else {
              attempt++;
              uniquePlate = `${row.license_plate || 'TN-XX-XX'}-${Math.floor(1000 + Math.random() * 9000)}`;
            }
          }

          await db.query(
            `INSERT INTO vehicles (driver_id, vehicle_brand, vehicle_model, manufacturing_year, vehicle_color, vehicle_number, vehicle_type_id, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
            [driverIntId, row.make, row.model, row.year || 2022, row.color, uniquePlate, row.is_active ? 1 : 0]
          );
          const [[newVeh]] = await db.query(
            `SELECT id, driver_id, vehicle_brand AS make, vehicle_model AS model, manufacturing_year AS year, vehicle_color AS color, vehicle_number AS license_plate, is_active FROM vehicles WHERE vehicle_number = ?`,
            [uniquePlate]
          );
          insertedRows.push(newVeh);
        }
        else if (table === 'rides') {
          const code = `ZR-${Math.floor(100000 + Math.random() * 900000)}`;
          // Get integer driver_id if driver UUID was passed
          let driverIntId = null;
          if (row.driver_id) {
            const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [row.driver_id]);
            driverIntId = dp?.id || null;
          }
          const [result] = await db.query(
            `INSERT INTO rides (ride_code, rider_id, driver_id, ride_type, ride_status, payment_method, payment_status, estimated_distance, estimated_duration, estimated_fare, booking_time, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
            [code, row.rider_id, driverIntId, mapRideTypeToMySQL(row.ride_type), mapStatusToMySQL(row.status || 'searching'), row.payment_method || 'Cash', row.payment_status || 'Pending', row.distance || 0, row.duration || 0, row.fare || 0]
          );
          const rideId = result.insertId;

          // Locations
          await db.query(
            `INSERT INTO ride_locations (ride_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [rideId, row.pickup_address, row.pickup_latitude, row.pickup_longitude, row.dropoff_address, row.dropoff_latitude, row.dropoff_longitude]
          );

          // Auto-populate ride_status_history on creation
          await db.query(
            `INSERT INTO ride_status_history (ride_id, ride_status, updated_by, remarks, created_at) VALUES (?, 'Searching', 'Rider', 'Ride requested by rider', NOW())`,
            [rideId]
          );

          // Auto-populate ride_fare_breakdown
          await db.query(
            `INSERT INTO ride_fare_breakdown (ride_id, base_fare, distance_charge, time_charge, waiting_charge, surge_charge, discount, total_amount, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [rideId, row.base_fare || 0, row.distance_charge || 0, row.time_charge || 0, row.waiting_charge || 0, row.surge_charge || 0, row.discount || 0, row.fare || 0]
          );

          // Auto-populate ride OTP
          const otpVal = String(Math.floor(1000 + Math.random() * 9000));
          await db.query(
            `INSERT INTO ride_otp (ride_id, otp, is_verified, generated_at) VALUES (?, ?, 0, NOW())`,
            [rideId, otpVal]
          );

          // Get created ride
          const [[newRide]] = await db.query(
            `SELECT r.id, r.ride_code, r.rider_id, dp.profile_id AS driver_id, r.ride_type, r.ride_status AS status, r.payment_method, r.payment_status, r.estimated_distance AS distance, r.estimated_duration AS duration, r.estimated_fare AS fare
             FROM rides r LEFT JOIN driver_profiles dp ON r.driver_id = dp.id WHERE r.id = ?`,
            [rideId]
          );
          if (newRide) {
            newRide.status = mapStatusToFrontend(newRide.status);
            newRide.pickup_address = row.pickup_address;
            newRide.pickup_latitude = row.pickup_latitude;
            newRide.pickup_longitude = row.pickup_longitude;
            newRide.dropoff_address = row.dropoff_address;
            newRide.dropoff_latitude = row.dropoff_latitude;
            newRide.dropoff_longitude = row.dropoff_longitude;
          }
          insertedRows.push(newRide);
        }
        else if (table === 'ratings') {
          // Resolve driver_profiles.id integer from ratee_id profile UUID
          const [[dp]] = await db.query('SELECT id, profile_id FROM driver_profiles WHERE profile_id = ?', [row.ratee_id]);
          const driverIntId = dp?.id || null;

          const [result] = await db.query(
            `INSERT INTO ratings (ride_id, rider_id, driver_id, rating, review, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [row.ride_id, row.rater_id, driverIntId, row.rating, row.comment || '']
          );

          // Update driver's overall average rating
          if (driverIntId) {
            const [[avgRes]] = await db.query(
              'SELECT AVG(rating) AS average FROM ratings WHERE driver_id = ?',
              [driverIntId]
            );
            const newAvg = parseFloat(Number(avgRes?.average || row.rating).toFixed(2));
            await db.query(
              'UPDATE driver_profiles SET rating = ? WHERE id = ?',
              [newAvg, driverIntId]
            );
          }

          const ratingId = result.insertId;
          const [[newRating]] = await db.query(
            `SELECT r.id, r.ride_id, r.rider_id AS rater_id, dp.profile_id AS ratee_id, r.rating, r.review AS comment, r.created_at
             FROM ratings r LEFT JOIN driver_profiles dp ON r.driver_id = dp.id WHERE r.id = ?`,
            [ratingId]
          );
          insertedRows.push(newRating);
        }
        else if (table === 'driver_reviews') {
          // Resolve driver_profiles.id integer from profile UUID
          const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [row.driver_id]);
          const driverIntId = dp?.id || null;

          const [result] = await db.query(
            `INSERT INTO driver_reviews (driver_id, rider_id, rating, comment, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [driverIntId, row.rider_id, row.rating, row.comment || '']
          );

          const reviewId = result.insertId;
          const [[newReview]] = await db.query(
            `SELECT dr.id, dp.profile_id AS driver_id, dr.rider_id, dr.rating, dr.comment, dr.created_at
             FROM driver_reviews dr LEFT JOIN driver_profiles dp ON dr.driver_id = dp.id WHERE dr.id = ?`,
            [reviewId]
          );
          insertedRows.push(newReview);
        }
        else if (table === 'wallet_transactions') {
          // Resolve wallets.id (the integer wallet_id) from the profile UUID (which is passed as wallet_id in the payload)
          const [[wallet]] = await db.query('SELECT id FROM wallets WHERE profile_id = ?', [row.wallet_id]);
          if (!wallet) {
            throw new Error(`Wallet not found for profile: ${row.wallet_id}`);
          }
          const walletIntId = wallet.id;
          const txType = row.type === 'deposit' ? 'Credit' : (row.type === 'ride_payment' ? 'Debit' : (row.type || 'Credit'));

          const [result] = await db.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, transaction_type, description, transaction_date)
             VALUES (?, ?, ?, ?, NOW())`,
            [walletIntId, row.amount, txType, row.description || '']
          );

          // Update wallets balance!
          const change = txType === 'Credit' ? row.amount : -row.amount;
          await db.query(
            'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE id = ?',
            [change, walletIntId]
          );

          const txId = result.insertId;
          const [[newTx]] = await db.query(
            `SELECT wallet_transactions.id, w.profile_id AS wallet_id, wallet_transactions.amount, LOWER(wallet_transactions.transaction_type) AS type, wallet_transactions.description, wallet_transactions.transaction_date AS created_at 
             FROM wallet_transactions LEFT JOIN wallets w ON wallet_transactions.wallet_id = w.id WHERE wallet_transactions.id = ?`,
            [txId]
          );
          insertedRows.push(newTx);
        }
        else if (table === 'platform_settings') {
          await db.query(
            `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
            [row.key, row.value, row.value]
          );
          insertedRows.push(row);
        }
        else {
          // Generic INSERT fallback
          const cols = Object.keys(row).map(k => {
            let colName = k;
            if (setup && setup.columnMap[k]) {
              colName = setup.columnMap[k];
            }
            return colName.includes('.') ? colName.split('.').pop() : colName;
          });
          const placeholders = cols.map(() => '?').join(', ');
          const vals = Object.keys(row).map(k => row[k]);
          const sql = `INSERT INTO \`${mappedTable}\` (\`${cols.join('`, `')}\`) VALUES (${placeholders})`;
          const [res] = await db.query(sql, vals);
          const [[insertedRow]] = await db.query(`SELECT * FROM \`${mappedTable}\` WHERE id = ?`, [row.id || res.insertId]);
          insertedRows.push(insertedRow);
        }
      }

      return { data: single ? insertedRows[0] : insertedRows, error: null };
    }

    if (action === 'update') {
      const row = { ...payload }; // Clone to avoid mutation issues

      // Handle driver_profiles document updates & status syncing
      if (table === 'driver_profiles') {
        const idFilter = filters.find(f => f.column === 'id' && f.operator === 'eq');
        const driverUuid = idFilter ? idFilter.value : null;

        if (driverUuid) {
          // Save to MongoDB
          try {
            const { MongoService } = await import('../services/mongoService.js');
            if (row.profile_photo_url) {
              await MongoService.saveDriverDocument(driverUuid, 'profile_photo_url', row.profile_photo_url);
            }
            if (row.license_image_url) {
              await MongoService.saveDriverDocument(driverUuid, 'license_image_url', row.license_image_url);
            }
          } catch (err) {
            console.error('[queryRepository] MongoDB update failed:', err.message);
          }

          // Sync profile_image in profiles table if profile_photo_url is updated
          if (row.profile_photo_url) {
            await db.query('UPDATE profiles SET profile_image = ? WHERE id = ?', [row.profile_photo_url, driverUuid]);
          }

          // Resolve driver_profiles.id integer
          const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [driverUuid]);
          if (dp && dp.id) {
            const driverIntId = dp.id;

            // Extract document updates
            const docFields = [];
            const docValues = [];
            const docMap = {
              license_image_url: 'license_photo',
              rc_book_url: 'rc_book_photo',
              insurance_url: 'insurance_photo',
              profile_photo_url: 'profile_photo',
              selfie_url: 'selfie_photo'
            };

            for (const [key, dbCol] of Object.entries(docMap)) {
              if (row[key] !== undefined) {
                docFields.push(`\`${dbCol}\` = ?`);
                docValues.push(row[key]);
              }
            }

            if (docFields.length > 0) {
              docValues.push(driverIntId);
              // Ensure a row exists in driver_documents first
              await db.query('INSERT IGNORE INTO driver_documents (driver_id) VALUES (?)', [driverIntId]);
              await db.query(
                `UPDATE driver_documents SET ${docFields.join(', ')} WHERE driver_id = ?`,
                docValues
              );
            }
          }
        }

        // Remove document keys from payload so we don't try to update them in driver_profiles table
        delete row.license_image_url;
        delete row.rc_book_url;
        delete row.insurance_url;
        delete row.profile_photo_url;
        delete row.selfie_url;
      }

      const setClauses = [];
      const queryParams = [];

      for (const key of Object.keys(row)) {
        if (key !== 'id' && key !== 'created_at') {
          let dbCol = key;
          let dbVal = row[key];

          if (setup && setup.columnMap[key]) {
            dbCol = setup.columnMap[key];
          }

          if (table === 'profiles' && key === 'password_hash') {
            const idFilter = filters.find(f => f.column === 'id' && f.operator === 'eq');
            const profileId = idFilter ? idFilter.value : null;
            if (profileId) {
              try {
                const { AuditService } = await import('../services/auditService.js');
                await AuditService.logAction({
                  profileId,
                  action: 'Password Reset',
                  tableName: 'profiles',
                  recordId: profileId,
                  ipAddress: null,
                  notes: 'Password updated via reset request'
                });

                const { NotificationService } = await import('../services/notificationService.js');
                await NotificationService.sendPushNotification(
                  profileId,
                  'Password Changed',
                  'Your account password has been changed successfully.'
                );
              } catch (err) {
                console.error('[queryRepository] Password reset notification/audit failed:', err.message);
              }
            }
          }

          if (table === 'rides' && key === 'status') {
            dbVal = mapStatusToMySQL(dbVal);
          }
          if (table === 'rides' && key === 'driver_id') {
            if (dbVal) {
              const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [dbVal]);
              dbVal = dp?.id || null;
            }
            dbCol = 'driver_id';
          }
          if (table === 'driver_profiles' && key === 'status') {
            const isOnline = dbVal === 'online' || dbVal === 1;
            if (isOnline) {
              const idFilter = filters.find(f => f.column === 'id' && f.operator === 'eq');
              const driverUuid = idFilter ? idFilter.value : null;
              if (driverUuid) {
                const [[dp]] = await db.query('SELECT verification_status FROM driver_profiles WHERE profile_id = ?', [driverUuid]);
                if (!dp || dp.verification_status !== 'Approved') {
                  throw new Error('Verification is pending or rejected. Driver cannot go online.');
                }
              }
            }
            dbVal = isOnline ? 1 : 0;
          }
          if (table === 'driver_profiles' && key === 'verification_status') {
            dbVal = mapVerificationStatusToMySQL(dbVal);
          }

          if (dbCol.includes('.')) {
            dbCol = dbCol.split('.').pop();
          }

          setClauses.push(`\`${dbCol}\` = ?`);
          queryParams.push(dbVal);
        }
      }

      const whereClauses = [];
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          let col = filter.column;
          let val = filter.value;

          if (setup && setup.columnMap[col]) {
            col = setup.columnMap[col];
          }
          if (table === 'rides' && filter.column === 'status') {
            val = mapStatusToMySQL(val);
          }
          if (table === 'rides' && filter.column === 'driver_id') {
            if (val) {
              const [[dp]] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [val]);
              val = dp?.id || null;
            }
            col = 'driver_id';
          }
          if (table === 'driver_profiles' && filter.column === 'status') {
            val = val === 'online' ? 1 : 0;
          }
          if (table === 'driver_profiles' && filter.column === 'verification_status') {
            val = mapVerificationStatusToMySQL(val);
          }

          if (col.includes('.')) {
            col = col.split('.').pop();
          }

          if (filter.operator === 'eq') {
            if (col === 'phone') {
              whereClauses.push(`REPLACE(phone, ' ', '') = REPLACE(?, ' ', '')`);
              queryParams.push(val);
            } else {
              whereClauses.push(`\`${col}\` = ?`);
              queryParams.push(val);
            }
          }
        }
      }

      if (whereClauses.length === 0) {
        return { data: null, error: { message: 'Update operations require targeting filters.' } };
      }

      const sql = `UPDATE \`${mappedTable}\` SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
      await db.query(sql, queryParams);

      // Auto-populate ride_status_history when ride status changes
      if (table === 'rides' && row.status) {
        const mysqlStatus = mapStatusToMySQL(row.status);
        const idFilter = filters.find(f => f.column === 'id' && f.operator === 'eq');
        if (idFilter) {
          const [[rideRow]] = await db.query('SELECT id FROM rides WHERE id = ?', [idFilter.value]);
          if (rideRow) {
            const updatedBy = row.updated_by || 'System';
            await db.query(
              `INSERT INTO ride_status_history (ride_id, ride_status, updated_by, remarks, created_at) VALUES (?, ?, ?, ?, NOW())`,
              [rideRow.id, mysqlStatus, updatedBy, `Status changed to ${mysqlStatus}`]
            ).catch(() => {}); // non-blocking
          }
        }
      }

      return { data: { success: true }, error: null };
    }

    if (action === 'delete') {
      // Ensure waste table exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS \`waste\` (
          \`id\` CHAR(36) NOT NULL,
          \`firebase_uid\` VARCHAR(128) DEFAULT NULL,
          \`username\` VARCHAR(50) DEFAULT NULL,
          \`password_hash\` VARCHAR(255) DEFAULT NULL,
          \`full_name\` VARCHAR(100) DEFAULT NULL,
          \`phone\` VARCHAR(20) DEFAULT NULL,
          \`email\` VARCHAR(100) DEFAULT NULL,
          \`role\` VARCHAR(20) DEFAULT 'rider',
          \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
      `).catch(() => {});

      const whereClauses = [];
      const queryParams = [];

      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          let col = filter.column;
          const val = filter.value;
          if (setup && setup.columnMap[col]) {
            col = setup.columnMap[col];
          }
          if (col.includes('.')) {
            col = col.split('.').pop();
          }
          if (filter.operator === 'eq') {
            if (col === 'phone') {
              whereClauses.push(`REPLACE(phone, ' ', '') = REPLACE(?, ' ', '')`);
              queryParams.push(val);
            } else {
              whereClauses.push(`\`${col}\` = ?`);
              queryParams.push(val);
            }
          }
        });
      }

      if (whereClauses.length === 0) {
        return { data: null, error: { message: 'Delete operations require targeting filters.' } };
      }

      // If we are deleting from profiles, back up profile details into waste table first
      if (mappedTable === 'profiles') {
        const selectSql = `SELECT * FROM \`profiles\` WHERE ${whereClauses.join(' AND ')}`;
        const [records] = await db.query(selectSql, queryParams);
        for (const record of records) {
          await db.query(
            `INSERT IGNORE INTO waste (id, firebase_uid, username, password_hash, full_name, phone, email, role, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              record.id,
              record.firebase_uid,
              record.username,
              record.password_hash,
              record.full_name,
              record.phone,
              record.email,
              record.role
            ]
          );
        }
      }

      const sql = `DELETE FROM \`${mappedTable}\` WHERE ${whereClauses.join(' AND ')}`;
      await db.query(sql, queryParams);

      return { data: { message: 'Delete complete' }, error: null };
    }

    throw new Error(`Unsupported dynamic action: ${action}`);
  }
};
