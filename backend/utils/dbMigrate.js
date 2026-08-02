import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const hashPassword = (pwd) => {
  const sha256 = crypto.createHash('sha256').update(pwd + 'zipride_salt_2024').digest('hex');
  return bcrypt.hashSync(sha256, 10);
};

export async function runDatabaseMigrations() {
  try {
    // Fetch existing tables
    let existingTables = [];
    try {
      const [rows] = await db.query('SHOW TABLES');
      if (rows && rows.length) {
        const tableKey = Object.keys(rows[0])[0];
        existingTables = rows.map(r => String(r[tableKey]).toLowerCase());
      }
    } catch (e) {}

    const tablesToCreate = [
      {
        name: 'profiles',
        sql: `CREATE TABLE IF NOT EXISTS \`profiles\` (
          \`id\` CHAR(36) NOT NULL,
          \`username\` VARCHAR(50) NOT NULL,
          \`password_hash\` VARCHAR(255) NOT NULL,
          \`full_name\` VARCHAR(100) NOT NULL,
          \`phone\` VARCHAR(20) NOT NULL,
          \`email\` VARCHAR(100) DEFAULT NULL,
          \`role\` ENUM('rider', 'driver', 'admin') NOT NULL,
          \`avatar_url\` VARCHAR(255) DEFAULT NULL,
          \`profile_image\` VARCHAR(255) DEFAULT NULL,
          \`dob\` DATE DEFAULT NULL,
          \`gender\` VARCHAR(20) DEFAULT NULL,
          \`referral_code\` VARCHAR(20) DEFAULT NULL,
          \`account_status\` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
          \`is_banned\` TINYINT(1) NOT NULL DEFAULT 0,
          \`ban_reason\` VARCHAR(255) DEFAULT NULL,
          \`phone_verified\` TINYINT(1) NOT NULL DEFAULT 0,
          \`email_verified\` TINYINT(1) NOT NULL DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`idx_profiles_username\` (\`username\`),
          UNIQUE KEY \`idx_profiles_phone\` (\`phone\`),
          UNIQUE KEY \`idx_profiles_email\` (\`email\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'driver_profiles',
        sql: `CREATE TABLE IF NOT EXISTS \`driver_profiles\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`profile_id\` CHAR(36) NOT NULL,
          \`driver_code\` VARCHAR(20) NOT NULL,
          \`email\` VARCHAR(100) DEFAULT NULL,
          \`license_number\` VARCHAR(50) DEFAULT NULL,
          \`license_expiry\` DATE DEFAULT NULL,
          \`experience_years\` INT DEFAULT NULL,
          \`vehicle_type\` VARCHAR(50) DEFAULT NULL,
          \`verification_status\` VARCHAR(100) NOT NULL DEFAULT 'pending',
          \`verification_date\` DATETIME DEFAULT NULL,
          \`verified_by\` CHAR(36) DEFAULT NULL,
          \`rejection_reason\` TEXT DEFAULT NULL,
          \`profile_photo\` VARCHAR(255) DEFAULT NULL,
          \`driving_licence_image\` VARCHAR(255) DEFAULT NULL,
          \`driving_licence_number\` VARCHAR(100) DEFAULT NULL,
          \`is_online\` TINYINT(1) NOT NULL DEFAULT 0,
          \`is_banned\` TINYINT(1) NOT NULL DEFAULT 0,
          \`total_rides\` INT NOT NULL DEFAULT 0,
          \`completed_rides\` INT NOT NULL DEFAULT 0,
          \`cancelled_rides\` INT NOT NULL DEFAULT 0,
          \`total_earnings\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          \`rating\` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
          \`online_seconds\` INT NOT NULL DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`idx_driver_profiles_profile_id\` (\`profile_id\`),
          UNIQUE KEY \`idx_driver_profiles_driver_code\` (\`driver_code\`),
          CONSTRAINT \`fk_driver_profiles_profile\` FOREIGN KEY (\`profile_id\`) REFERENCES \`profiles\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'vehicles',
        sql: `CREATE TABLE IF NOT EXISTS \`vehicles\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`driver_id\` INT NOT NULL,
          \`vehicle_number\` VARCHAR(20) NOT NULL,
          \`vehicle_brand\` VARCHAR(50) NOT NULL,
          \`vehicle_model\` VARCHAR(50) NOT NULL,
          \`vehicle_color\` VARCHAR(30) DEFAULT NULL,
          \`manufacturing_year\` INT DEFAULT NULL,
          \`seating_capacity\` INT DEFAULT 4,
          \`fuel_type\` VARCHAR(30) DEFAULT NULL,
          \`rc_number\` VARCHAR(50) DEFAULT NULL,
          \`verification_status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
          \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`idx_vehicles_number\` (\`vehicle_number\`),
          CONSTRAINT \`fk_vehicles_driver\` FOREIGN KEY (\`driver_id\`) REFERENCES \`driver_profiles\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'wallets',
        sql: `CREATE TABLE IF NOT EXISTS \`wallets\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`profile_id\` CHAR(36) NOT NULL,
          \`wallet_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          \`wallet_status\` ENUM('Active', 'Frozen', 'Suspended') NOT NULL DEFAULT 'Active',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`idx_wallets_profile_id\` (\`profile_id\`),
          CONSTRAINT \`fk_wallets_profile\` FOREIGN KEY (\`profile_id\`) REFERENCES \`profiles\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'wallet_transactions',
        sql: `CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`wallet_id\` INT NOT NULL,
          \`ride_id\` BIGINT DEFAULT NULL,
          \`payment_id\` BIGINT DEFAULT NULL,
          \`transaction_type\` VARCHAR(50) NOT NULL,
          \`type\` VARCHAR(50) DEFAULT NULL,
          \`amount\` DECIMAL(12,2) NOT NULL,
          \`status\` ENUM('Success', 'Pending', 'Failed') NOT NULL DEFAULT 'Success',
          \`description\` TEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`transaction_date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`fk_wallet_transactions_wallet\` FOREIGN KEY (\`wallet_id\`) REFERENCES \`wallets\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'ride_tips',
        sql: `CREATE TABLE IF NOT EXISTS \`ride_tips\` (
          \`id\` BIGINT AUTO_INCREMENT NOT NULL,
          \`ride_id\` BIGINT NOT NULL,
          \`driver_id\` INT NOT NULL,
          \`rider_id\` CHAR(36) NOT NULL,
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`payment_method\` VARCHAR(30) NOT NULL DEFAULT 'Wallet',
          \`payment_status\` VARCHAR(30) NOT NULL DEFAULT 'Success',
          \`transaction_id\` VARCHAR(100) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_ride_tips_ride\` (\`ride_id\`),
          KEY \`idx_ride_tips_driver\` (\`driver_id\`),
          KEY \`idx_ride_tips_rider\` (\`rider_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'driver_settlements',
        sql: `CREATE TABLE IF NOT EXISTS \`driver_settlements\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`driver_id\` INT NOT NULL,
          \`profile_id\` CHAR(36) NOT NULL,
          \`amount\` DECIMAL(12,2) NOT NULL,
          \`status\` ENUM('Pending', 'Approved', 'Rejected', 'Settled') NOT NULL DEFAULT 'Pending',
          \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
          \`bank_details\` TEXT DEFAULT NULL,
          \`notes\` TEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`settled_at\` DATETIME DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`idx_settlements_driver\` (\`driver_id\`),
          KEY \`idx_settlements_profile\` (\`profile_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'app_settings',
        sql: `CREATE TABLE IF NOT EXISTS \`app_settings\` (
          \`setting_key\` VARCHAR(50) NOT NULL,
          \`setting_value\` TEXT NOT NULL,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`setting_key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'notifications',
        sql: `CREATE TABLE IF NOT EXISTS \`notifications\` (
          \`id\` INT AUTO_INCREMENT NOT NULL,
          \`profile_id\` CHAR(36) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`body\` TEXT DEFAULT NULL,
          \`message\` TEXT DEFAULT NULL,
          \`notification_type\` VARCHAR(50) DEFAULT 'System',
          \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_notifications_profile\` (\`profile_id\`),
          KEY \`idx_notifications_read\` (\`is_read\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'rides',
        sql: `CREATE TABLE IF NOT EXISTS \`rides\` (
          \`id\` BIGINT AUTO_INCREMENT NOT NULL,
          \`rider_id\` CHAR(36) NOT NULL,
          \`driver_id\` INT DEFAULT NULL,
          \`driver_profile_id\` CHAR(36) DEFAULT NULL,
          \`pickup_address\` TEXT DEFAULT NULL,
          \`dropoff_address\` TEXT DEFAULT NULL,
          \`pickup_lat\` DECIMAL(10,7) DEFAULT NULL,
          \`pickup_lng\` DECIMAL(10,7) DEFAULT NULL,
          \`dropoff_lat\` DECIMAL(10,7) DEFAULT NULL,
          \`dropoff_lng\` DECIMAL(10,7) DEFAULT NULL,
          \`ride_status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
          \`payment_status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
          \`payment_method\` VARCHAR(50) DEFAULT 'Cash',
          \`estimated_fare\` DECIMAL(10,2) DEFAULT NULL,
          \`final_fare\` DECIMAL(10,2) DEFAULT NULL,
          \`distance_km\` DECIMAL(8,3) DEFAULT NULL,
          \`duration_min\` INT DEFAULT NULL,
          \`vehicle_type\` VARCHAR(50) DEFAULT NULL,
          \`pickup_time\` DATETIME DEFAULT NULL,
          \`completed_time\` DATETIME DEFAULT NULL,
          \`cancelled_time\` DATETIME DEFAULT NULL,
          \`cancel_reason\` TEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_rides_rider\` (\`rider_id\`),
          KEY \`idx_rides_driver\` (\`driver_id\`),
          KEY \`idx_rides_status\` (\`ride_status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'payments',
        sql: `CREATE TABLE IF NOT EXISTS \`payments\` (
          \`id\` BIGINT AUTO_INCREMENT NOT NULL,
          \`ride_id\` BIGINT DEFAULT NULL,
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
          \`payment_method\` VARCHAR(50) DEFAULT 'Cash',
          \`gateway\` VARCHAR(50) DEFAULT NULL,
          \`gateway_order_id\` VARCHAR(100) DEFAULT NULL,
          \`transaction_id\` VARCHAR(100) DEFAULT NULL,
          \`created_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`completed_time\` DATETIME DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`idx_payments_ride\` (\`ride_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      }
    ];

    for (const table of tablesToCreate) {
      if (existingTables.includes(table.name.toLowerCase())) {
        continue; // Skip table if it already exists
      }
      try {
        await db.query(table.sql);
      } catch (e) {
        console.warn(`[Migration Failed] ${table.name}`);
      }
    }

    // Ensure missing columns exist in profiles if table was created previously
    try {
      const [pCols] = await db.query(`SHOW COLUMNS FROM profiles`);
      const pColNames = new Set(pCols.map(c => c.Field));
      if (!pColNames.has('date_of_birth')) {
        await db.query(`ALTER TABLE profiles ADD COLUMN date_of_birth DATE DEFAULT NULL`).catch(() => {});
        console.log('[Migration] Added profiles.date_of_birth column');
      }
      if (!pColNames.has('dob')) {
        await db.query(`ALTER TABLE profiles ADD COLUMN dob DATE DEFAULT NULL`).catch(() => {});
      }
      if (!pColNames.has('address')) {
        await db.query(`ALTER TABLE profiles ADD COLUMN address TEXT DEFAULT NULL`).catch(() => {});
      }
      if (!pColNames.has('last_login')) {
        await db.query(`ALTER TABLE profiles ADD COLUMN last_login DATETIME DEFAULT NULL`).catch(() => {});
      }
    } catch (e) {}

    // Ensure missing columns exist in driver_profiles if table was created previously
    try {
      const [columns] = await db.query(`SHOW COLUMNS FROM driver_profiles`);
      const existingColNames = new Set(columns.map(c => c.Field));

      const columnsToAdd = [
        { name: 'verification_date', type: 'DATETIME DEFAULT NULL' },
        { name: 'verified_by', type: 'CHAR(36) DEFAULT NULL' },
        { name: 'rejection_reason', type: 'TEXT DEFAULT NULL' },
        { name: 'profile_photo', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'driving_licence_image', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'driving_licence_number', type: 'VARCHAR(100) DEFAULT NULL' }
      ];

      for (const col of columnsToAdd) {
        if (!existingColNames.has(col.name)) {
          await db.query(`ALTER TABLE driver_profiles ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
        }
      }
      await db.query(`ALTER TABLE driver_profiles MODIFY COLUMN verification_status VARCHAR(100) NOT NULL DEFAULT 'pending'`).catch(() => {});
    } catch (e) {}

    // Ensure status column in driver_settlements is VARCHAR(50) to allow 'Paid'
    try {
      await db.query(`ALTER TABLE driver_settlements MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'`).catch(() => {});
    } catch (e) {}

    // Ensure notifications table has required columns (message, notification_type) and body allows NULL
    try {
      const [notifCols] = await db.query(`SHOW COLUMNS FROM notifications`);
      const notifColNames = new Set(notifCols.map(c => c.Field));
      if (!notifColNames.has('message')) {
        await db.query(`ALTER TABLE notifications ADD COLUMN message TEXT DEFAULT NULL`).catch(() => {});
        console.log('[Migration] Added notifications.message column');
      }
      if (!notifColNames.has('notification_type')) {
        await db.query(`ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50) DEFAULT NULL`).catch(() => {});
        console.log('[Migration] Added notifications.notification_type column');
      }
      if (notifColNames.has('body')) {
        await db.query(`ALTER TABLE notifications MODIFY COLUMN body TEXT DEFAULT NULL`).catch(() => {});
      }
    } catch (e) {}

    // Ensure missing columns exist in wallet_transactions
    try {
      const [wtCols] = await db.query(`SHOW COLUMNS FROM wallet_transactions`);
      const wtColNames = new Set(wtCols.map(c => c.Field));

      const wtColsToAdd = [
        { name: 'payment_id', type: 'BIGINT DEFAULT NULL' },
        { name: 'type', type: 'VARCHAR(50) DEFAULT NULL' },
        { name: 'status', type: "VARCHAR(30) NOT NULL DEFAULT 'Success'" },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
      ];

      for (const col of wtColsToAdd) {
        if (!wtColNames.has(col.name)) {
          await db.query(`ALTER TABLE wallet_transactions ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
        }
      }
    } catch (e) {}

    // Seed default admin profile and settings if empty
    try {
      const [[adminCount]] = await db.query(`SELECT COUNT(*) AS total FROM profiles WHERE role = 'admin'`);
      if (adminCount.total === 0) {
        const adminId = crypto.randomUUID();
        await db.query(
          `INSERT IGNORE INTO profiles (id, username, password_hash, full_name, phone, email, role, referral_code, account_status, phone_verified, created_at, updated_at)
           VALUES (?, 'admin', ?, 'ZipRide Admin', '+919000000000', 'grahambillu72@gmail.com', 'admin', 'ADMINREF', 'active', 1, NOW(), NOW())`,
          [adminId, hashPassword('Grahambillu@72')]
        );
      }

      const settings = [
        ['commission_percentage', '15'],
        ['base_fare_economy', '40'],
        ['per_km_rate', '12'],
        ['per_min_rate', '2'],
        ['surge_multiplier_default', '1.0'],
        ['night_charge_percent', '10'],
        ['gst_percent', '5']
      ];
      for (const [key, value] of settings) {
        await db.query(
          `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, value, value]
        ).catch(() => {});
      }
    } catch (e) {}

    console.log('✅ Migration Completed');
  } catch (err) {
    console.warn(`[Migration Failed] schema`);
  }
}

export default runDatabaseMigrations;
