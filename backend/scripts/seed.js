// backend/scripts/seed.js
// Seeds the database with admin, vehicle types, app settings, sample driver, and rider.
// Uses the REAL schema tables: profiles, driver_profiles, vehicles, wallets, app_settings
// Run: node scripts/seed.js

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const host = process.env.MYSQL_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const port = parseInt(process.env.MYSQL_PORT) || 4000;

const dbConfig = {
  host,
  port,
  user: process.env.MYSQL_USER || 'cBAXK2TmpioAcwS.root',
  password: process.env.MYSQL_PASSWORD || '9B7vqd4Ze5YvGkUV',
  database: process.env.MYSQL_DATABASE || 'zipride',
  ssl: (host.includes('tidbcloud') || port === 4000 || process.env.MYSQL_SSL === 'true') ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined
};

const hash = (pwd) => {
  const sha256 = crypto.createHash('sha256').update(pwd + 'zipride_salt_2024').digest('hex');
  return bcrypt.hashSync(sha256, 10);
};
const uuid = () => crypto.randomUUID();

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('[Seed] Connected. Starting seed...\n');

    // ── 1. Admin Profile ──────────────────────────────────────────
    const adminId = uuid();
    await conn.execute(
      `INSERT IGNORE INTO profiles (id, username, password_hash, full_name, phone, email, role, referral_code, account_status, phone_verified, created_at, updated_at)
       VALUES (?, 'admin', ?, 'ZipRide Admin', '+919000000000', 'grahambillu72@gmail.com', 'admin', 'ADMINREF', 'active', 1, NOW(), NOW())`,
      [adminId, hash('Grahambillu@72')]
    );
    // Admin record
    await conn.execute(
      `INSERT IGNORE INTO admins (profile_id, admin_role, can_manage_users, can_manage_drivers, can_manage_rides, can_manage_wallet, can_manage_payments, can_view_reports, created_at)
       VALUES (?, 'super_admin', 1, 1, 1, 1, 1, 1, NOW())`,
      [adminId]
    );
    console.log('✅ Admin seeded (email: grahambillu72@gmail.com / password: Grahambillu@72)');

    // ── 2. Sample Rider ───────────────────────────────────────────
    const riderId = uuid();
    await conn.execute(
      `INSERT IGNORE INTO profiles (id, username, password_hash, full_name, phone, email, role, referral_code, account_status, phone_verified, created_at, updated_at)
       VALUES (?, 'rider1', ?, 'Test Rider', '+919111111111', 'rider@example.com', 'rider', 'RIDER001', 'active', 1, NOW(), NOW())`,
      [riderId, hash('Rider@123')]
    );
    // Wallet for rider
    await conn.execute(
      `INSERT IGNORE INTO wallets (profile_id, wallet_balance, wallet_status, created_at, updated_at)
       VALUES (?, 500.00, 'Active', NOW(), NOW())`,
      [riderId]
    );
    console.log('✅ Sample rider seeded (username: rider1 / password: Rider@123, wallet: ₹500)');

    // ── 3. Sample Driver ──────────────────────────────────────────
    const driverId = uuid();
    await conn.execute(
      `INSERT IGNORE INTO profiles (id, username, password_hash, full_name, phone, email, role, referral_code, account_status, phone_verified, created_at, updated_at)
       VALUES (?, 'driver1', ?, 'Test Driver', '+919222222222', 'driver@example.com', 'driver', 'DRVR001', 'active', 1, NOW(), NOW())`,
      [driverId, hash('Driver@123')]
    );
    const [dpResult] = await conn.execute(
      `INSERT IGNORE INTO driver_profiles (profile_id, driver_code, email, license_number, license_expiry, experience_years, vehicle_type, verification_status, is_online, is_banned, total_rides, completed_rides, cancelled_rides, total_earnings, rating, created_at, updated_at)
       VALUES (?, 'DRV001', 'driver@example.com', 'TN1234567890', '2028-12-31', 3, 'Car', 'Approved', 0, 0, 0, 0, 0, 0.00, 5.00, NOW(), NOW())`,
      [driverId]
    );
    // Get the driver_profiles.id (may be 0 from INSERT IGNORE if already exists)
    const [[dpRow]] = await conn.execute(`SELECT id FROM driver_profiles WHERE profile_id = ?`, [driverId]);
    const dpId = dpRow?.id || dpResult.insertId;

    // Vehicle
    await conn.execute(
      `INSERT IGNORE INTO vehicles (driver_id, vehicle_number, vehicle_brand, vehicle_model, vehicle_color, manufacturing_year, seating_capacity, fuel_type, rc_number, verification_status, is_active, created_at, updated_at)
       VALUES (?, 'TN01AB1234', 'Toyota', 'Innova Crysta', 'White', 2022, 7, 'Petrol', 'RC123456', 'Approved', 1, NOW(), NOW())`,
      [dpId]
    );
    // Wallet for driver
    await conn.execute(
      `INSERT IGNORE INTO wallets (profile_id, wallet_balance, wallet_status, created_at, updated_at)
       VALUES (?, 0.00, 'Active', NOW(), NOW())`,
      [driverId]
    );
    // Live location placeholder (uses driver_profiles.id as driver_id)
    await conn.execute(
      `INSERT IGNORE INTO driver_live_location (driver_id, latitude, longitude, updated_at)
       VALUES (?, 13.0827, 80.2707, NOW())`,
      [dpId]
    );
    console.log('✅ Sample driver seeded (username: driver1 / password: Driver@123, status: Approved)');

    // ── 4. App Settings ───────────────────────────────────────────
    const settings = [
      ['commission_percentage', '15'],
      ['base_fare_economy', '40'],
      ['per_km_rate', '12'],
      ['per_min_rate', '2'],
      ['surge_multiplier_default', '1.0'],
      ['night_charge_percent', '10'],
      ['gst_percent', '5'],
      ['max_ride_distance_km', '100'],
      ['driver_search_radius_km', '10'],
      ['referral_bonus_amount', '50'],
      ['cancellation_fee_rider', '20'],
      ['cancellation_fee_driver', '0'],
    ];
    for (const [key, value] of settings) {
      await conn.execute(
        `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, value, value]
      );
    }
    console.log('✅ App settings seeded (12 settings)');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('  Admin   → username: admin    / password: Admin@123');
    console.log('  Rider   → username: rider1   / password: Rider@123');
    console.log('  Driver  → username: driver1  / password: Driver@123\n');
  } catch (err) {
    console.error('[Seed] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
