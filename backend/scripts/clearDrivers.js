// backend/scripts/clearDrivers.js
// Safe utility to delete all Driver profiles and their associated data, preserving Rider and Admin data.
// Run: node scripts/clearDrivers.js

import mysql from 'mysql2/promise';
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

async function clearDrivers() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('[Clear Drivers] Connected to database.');

    // 1. Fetch all driver IDs from profiles
    const [drivers] = await conn.execute("SELECT id FROM profiles WHERE role = 'driver'");
    if (drivers.length === 0) {
      console.log('[Clear Drivers] No drivers found in the database. Nothing to delete.');
      return;
    }

    const driverIds = drivers.map(d => d.id);
    console.log(`[Clear Drivers] Found ${driverIds.length} driver account(s) to clear.`);

    // Disable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔑 Disabled foreign key checks.');

    // List of delete configurations.
    const steps = [
      {
        label: 'driver_documents',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_documents WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_bank_accounts',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_bank_accounts WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_earnings',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_earnings WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_live_location',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_live_location WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_online_history',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_online_history WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_reviews',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_reviews WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_shifts',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_shifts WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'blocked_drivers',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM blocked_drivers WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'vehicle_documents',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM vehicle_documents WHERE vehicle_id IN (SELECT id FROM vehicles WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders})))`, driverIds);
        }
      },
      {
        label: 'vehicle_images',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM vehicle_images WHERE vehicle_id IN (SELECT id FROM vehicles WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders})))`, driverIds);
        }
      },
      {
        label: 'vehicle_maintenance',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM vehicle_maintenance WHERE vehicle_id IN (SELECT id FROM vehicles WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders})))`, driverIds);
        }
      },
      {
        label: 'vehicles',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM vehicles WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'ride_tracking',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_tracking WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'ratings (by driver_id)',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ratings WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'withdrawal_requests',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM withdrawal_requests WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'rides (driver assignments)',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM rides WHERE driver_id IN (SELECT id FROM driver_profiles WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'driver_profiles',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM driver_profiles WHERE profile_id IN (${placeholders})`, driverIds);
        }
      },
      {
        label: 'wallet_transactions (by wallet_id)',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE profile_id IN (${placeholders}))`, driverIds);
        }
      },
      {
        label: 'wallets',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM wallets WHERE profile_id IN (${placeholders})`, driverIds);
        }
      },
      {
        label: 'login_history',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM login_history WHERE profile_id IN (${placeholders})`, driverIds);
        }
      },
      {
        label: 'device_tokens',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM device_tokens WHERE profile_id IN (${placeholders})`, driverIds);
        }
      },
      {
        label: 'notifications',
        run: async () => {
          const placeholders = driverIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM notifications WHERE profile_id IN (${placeholders})`, driverIds);
        }
      },
      {
        label: 'profiles (role = driver)',
        run: async () => {
          await conn.execute("DELETE FROM profiles WHERE role = 'driver'");
        }
      }
    ];

    for (const step of steps) {
      try {
        await step.run();
        console.log(`🧹 Cleared Driver data from: ${step.label}`);
      } catch (err) {
        console.log(`⚠️  Skipped step: ${step.label} (${err.message})`);
      }
    }

    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔑 Re-enabled foreign key checks.');

    console.log('\n🎉 Successfully cleared all driver profiles and login details!\n');
  } catch (err) {
    console.error('[Clear Drivers] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

clearDrivers();
