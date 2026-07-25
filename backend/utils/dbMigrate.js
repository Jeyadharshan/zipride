import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hashPassword = (pwd) => {
  const sha256 = crypto.createHash('sha256').update(pwd + 'zipride_salt_2024').digest('hex');
  return bcrypt.hashSync(sha256, 10);
};

export async function runDatabaseMigrations() {
  try {
    console.log('[Migration] Checking database tables and schema...');

    // 1. Ensure core database tables exist
    const createTableStatements = [
      `CREATE TABLE IF NOT EXISTS \`profiles\` (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS \`driver_profiles\` (
        \`id\` INT AUTO_INCREMENT NOT NULL,
        \`profile_id\` CHAR(36) NOT NULL,
        \`driver_code\` VARCHAR(20) NOT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`license_number\` VARCHAR(50) DEFAULT NULL,
        \`license_expiry\` DATE DEFAULT NULL,
        \`experience_years\` INT DEFAULT NULL,
        \`vehicle_type\` VARCHAR(50) DEFAULT NULL,
        \`verification_status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
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
        UNIQUE KEY \`idx_driver_profiles_driver_code\` (\`driver_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS \`vehicles\` (
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
        UNIQUE KEY \`idx_vehicles_number\` (\`vehicle_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS \`wallets\` (
        \`id\` INT AUTO_INCREMENT NOT NULL,
        \`profile_id\` CHAR(36) NOT NULL,
        \`wallet_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`wallet_status\` ENUM('Active', 'Frozen', 'Suspended') NOT NULL DEFAULT 'Active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_wallets_profile_id\` (\`profile_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS \`app_settings\` (
        \`setting_key\` VARCHAR(50) NOT NULL,
        \`setting_value\` TEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    for (const sql of createTableStatements) {
      await db.query(sql).catch(e => console.warn('[Migration] Note on table creation:', e.message));
    }

    // 2. Ensure missing columns in driver_profiles exist
    const columnsToAdd = [
      { name: 'verification_date', type: 'DATETIME DEFAULT NULL' },
      { name: 'verified_by', type: 'CHAR(36) DEFAULT NULL' },
      { name: 'rejection_reason', type: 'TEXT DEFAULT NULL' },
      { name: 'profile_photo', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'driving_licence_image', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'driving_licence_number', type: 'VARCHAR(100) DEFAULT NULL' }
    ];

    try {
      const [columns] = await db.query(`SHOW COLUMNS FROM driver_profiles`);
      const existingColNames = new Set(columns.map(c => c.Field));

      for (const col of columnsToAdd) {
        if (!existingColNames.has(col.name)) {
          console.log(`[Migration] Adding missing column "${col.name}" to driver_profiles...`);
          await db.query(`ALTER TABLE driver_profiles ADD COLUMN ${col.name} ${col.type}`).catch(() => {});
        }
      }
    } catch (e) {}

    // 3. Inspect verification_status column definition and alter to VARCHAR(100)
    try {
      await db.query(`ALTER TABLE driver_profiles MODIFY COLUMN verification_status VARCHAR(100) NOT NULL DEFAULT 'pending'`).catch(() => {});
    } catch (e) {}

    // 4. Seed default admin profile and app settings if empty
    try {
      const [[adminCount]] = await db.query(`SELECT COUNT(*) AS total FROM profiles WHERE role = 'admin'`);
      if (adminCount.total === 0) {
        console.log('[Migration] Seeding initial Admin user...');
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
    } catch (e) {
      console.warn('[Migration] Note on seeding initial data:', e.message);
    }

    console.log('✅ [Migration] Database schema & default data setup completed successfully.');
  } catch (err) {
    console.warn('⚠️ [Migration] Database migration check completed with warning:', err.message);
  }
}

export default runDatabaseMigrations;
