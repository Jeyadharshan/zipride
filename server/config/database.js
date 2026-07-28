import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectionConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Abirami@27',
  database: process.env.MYSQL_DATABASE || 'zipride',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('[MySQL] Connecting to pool at:', `${connectionConfig.host}:${connectionConfig.port}`);

const pool = mysql.createPool(connectionConfig);

// Helper to convert SQLite "INSERT OR IGNORE" to MySQL "INSERT IGNORE"
const formatSql = (sql) => {
  return sql.replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE');
};

// Promisified MySQL helpers to mimic SQLite helper API
export const dbRun = async (sql, params = []) => {
  const formattedSql = formatSql(sql);
  const [result] = await pool.execute(formattedSql, params);
  return { id: result.insertId, changes: result.affectedRows };
};

export const dbGet = async (sql, params = []) => {
  const formattedSql = formatSql(sql);
  const [rows] = await pool.execute(formattedSql, params);
  return rows[0] || null;
};

export const dbAll = async (sql, params = []) => {
  const formattedSql = formatSql(sql);
  const [rows] = await pool.execute(formattedSql, params);
  return rows;
};

export const dbExec = async (sql) => {
  const formattedSql = formatSql(sql);
  // Split multiple statements if any
  const statements = formattedSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const statement of statements) {
    await pool.execute(statement);
  }
};

// Seed function to pre-populate database with dummy accounts for testing
const seedDatabase = async () => {
  try {
    const browserSha256OfPassword = 'bcf56eb28114f6b1580c883e4a9e52c8033a59df6f15eb1f32a76f2b4c102a90';
    const actualTestHash = await bcrypt.hash(browserSha256OfPassword, 10);
    
    // Seed standard Rider: rider / password
    const existingRider = await dbGet("SELECT id FROM users WHERE username = 'rider'");
    if (!existingRider) {
      const riderId = 'rider-test-uuid-000000000000';
      await dbRun(
        `INSERT INTO users (id, email, full_name, role, phone, username, password_hash, account_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [riderId, 'rider@zipride.in', 'ZipRide Rider', 'rider', '+919999999999', 'rider', actualTestHash, 'active']
      );
      await dbRun(`INSERT IGNORE INTO wallets (id, balance) VALUES (?, 500.00)`, [riderId]);
      console.log('[MySQL] Seeded rider account (rider / password)');
    }

    // Seed standard Driver: driver / password
    const existingDriver = await dbGet("SELECT id FROM users WHERE username = 'driver'");
    if (!existingDriver) {
      const driverId = 'driver-test-uuid-000000000000';
      await dbRun(
        `INSERT INTO users (id, email, full_name, role, phone, username, password_hash, account_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [driverId, 'driver@zipride.in', 'ZipRide Driver', 'driver', '+918888888888', 'driver', actualTestHash, 'active']
      );
      await dbRun(
        `INSERT IGNORE INTO drivers (id, status, rating, verification_status, email, is_banned)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [driverId, 'offline', 5.0, 'approved', 'driver@zipride.in', 0]
      );
      await dbRun(
        `INSERT IGNORE INTO vehicles (id, driver_id, make, model, year, color, license_plate, vehicle_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['vehicle-test-uuid', driverId, 'Maruti Suzuki', 'Swift Dzire', 2022, 'White', 'MH12AB1234', 'Economy', 1]
      );
      await dbRun(`INSERT IGNORE INTO wallets (id, balance) VALUES (?, 150.00)`, [driverId]);
      console.log('[MySQL] Seeded driver account (driver / password)');
    }

    // Seed standard Admin: admin / password
    const existingAdmin = await dbGet("SELECT id FROM users WHERE role = 'admin'");
    if (!existingAdmin) {
      const adminId = 'admin-test-uuid-000000000000';
      await dbRun(
        `INSERT INTO users (id, email, full_name, role, phone, username, password_hash, account_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'admin@zipride.in', 'System Admin', 'admin', '+917777777777', 'admin', actualTestHash, 'active']
      );
      console.log('[MySQL] Seeded admin account (admin / password)');
    }

  } catch (err) {
    console.error('[MySQL] Error seeding database:', err.message);
  }
};

// Initialize database schema and seeds
export const initDatabase = async () => {
  try {
    // MySQL schema is assumed to be already created by the primary backend or schema migrations.
    // We will run the seed check to ensure default users exist.
    await seedDatabase();
  } catch (err) {
    console.error('[MySQL] Database initialization/seed check failed:', err.message);
  }
};

export default pool;
