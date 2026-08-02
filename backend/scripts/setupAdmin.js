// backend/scripts/setupAdmin.js
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Abirami@27',
    database: process.env.MYSQL_DATABASE || 'zipride'
  });

  const hash = bcrypt.hashSync('Grahambillu@72', 10);
  const targetEmail = 'grahambillu72@gmail.com';

  try {
    // Check if any admin exists
    const [admins] = await conn.execute("SELECT * FROM profiles WHERE role = 'admin'");
    if (admins.length > 0) {
      console.log(`Admin found. Updating credentials for id: ${admins[0].id}...`);
      await conn.execute(
        "UPDATE profiles SET email = ?, password_hash = ? WHERE id = ?",
        [targetEmail, hash, admins[0].id]
      );
      console.log('✅ Admin credentials updated successfully.');
    } else {
      console.log('No admin found. Creating one...');
      const adminId = 'admin-uuid-value-123456';
      await conn.execute(
        `INSERT INTO profiles (id, username, password_hash, full_name, phone, email, role, account_status, phone_verified, created_at, updated_at)
         VALUES (?, 'admin', ?, 'ZipRide Admin', '+919000000000', ?, 'admin', 'active', 1, NOW(), NOW())`,
        [adminId, hash, targetEmail]
      );
      await conn.execute(
        `INSERT INTO admins (profile_id, admin_role, can_manage_users, can_manage_drivers, can_manage_rides, can_manage_wallet, can_manage_payments, can_view_reports, created_at)
         VALUES (?, 'super_admin', 1, 1, 1, 1, 1, 1, NOW())`,
        [adminId]
      );
      console.log('✅ Admin credentials created successfully.');
    }
  } catch (err) {
    console.error('Error setting up admin:', err.message);
  } finally {
    await conn.end();
  }
}

run();
