// backend/scripts/clearRiders.js
// Safe utility to delete all Rider (user) profiles and their associated data, preserving Driver and Admin data.
// Run: node scripts/clearRiders.js

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

async function clearRiders() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('[Clear Riders] Connected to database.');

    // 1. Fetch all rider IDs
    const [riders] = await conn.execute("SELECT id FROM profiles WHERE role = 'rider'");
    if (riders.length === 0) {
      console.log('[Clear Riders] No riders found in the database. Nothing to delete.');
      return;
    }

    const riderIds = riders.map(r => r.id);
    console.log(`[Clear Riders] Found ${riderIds.length} rider account(s) to clear.`);

    // Disable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔑 Disabled foreign key checks.');

    // List of delete configurations.
    const steps = [
      {
        label: 'wallet_transactions (by wallet_id)',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE profile_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'wallets',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM wallets WHERE profile_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'ride_locations',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_locations WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'ride_otp',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_otp WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'ride_status_history',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_status_history WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'ride_fare_breakdown',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_fare_breakdown WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'ride_cancellations',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_cancellations WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'ride_tracking',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ride_tracking WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'payments (by ride_id)',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM payments WHERE ride_id IN (SELECT id FROM rides WHERE rider_id IN (${placeholders}))`, riderIds);
        }
      },
      {
        label: 'rides',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM rides WHERE rider_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'favourite_locations',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM favourite_locations WHERE rider_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'recent_locations',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM recent_locations WHERE rider_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'device_tokens',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM device_tokens WHERE profile_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'login_history',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM login_history WHERE profile_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'notifications',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM notifications WHERE profile_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'ratings',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM ratings WHERE rider_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'complaints',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM complaints WHERE complainant_id IN (${placeholders})`, riderIds);
        }
      },
      {
        label: 'referral_rewards',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM referral_rewards WHERE referral_id IN (SELECT id FROM referrals WHERE referrer_id IN (${placeholders}) OR referred_id IN (${placeholders}))`, [...riderIds, ...riderIds]);
        }
      },
      {
        label: 'referrals',
        run: async () => {
          const placeholders = riderIds.map(() => '?').join(',');
          await conn.execute(`DELETE FROM referrals WHERE referrer_id IN (${placeholders}) OR referred_id IN (${placeholders})`, [...riderIds, ...riderIds]);
        }
      },
      {
        label: 'profiles (role = rider)',
        run: async () => {
          await conn.execute("DELETE FROM profiles WHERE role = 'rider'");
        }
      }
    ];

    for (const step of steps) {
      try {
        await step.run();
        console.log(`🧹 Cleared Rider data from: ${step.label}`);
      } catch (err) {
        console.log(`⚠️  Skipped step: ${step.label} (${err.message})`);
      }
    }

    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔑 Re-enabled foreign key checks.');

    console.log('\n🎉 Successfully cleared all rider profiles and login details!\n');
  } catch (err) {
    console.error('[Clear Riders] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

clearRiders();
