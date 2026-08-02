import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Abirami@27',
  database: process.env.MYSQL_DATABASE || 'zipride',
};

async function migrate() {
  console.log('[Migration] Connecting to MySQL...');
  const connection = await mysql.createConnection(connectionConfig);
  try {
    console.log('[Migration] Checking if online_seconds column exists in driver_profiles...');
    const [columns] = await connection.execute('SHOW COLUMNS FROM driver_profiles LIKE "online_seconds"');
    if (columns.length === 0) {
      console.log('[Migration] Adding online_seconds column to driver_profiles...');
      await connection.execute('ALTER TABLE driver_profiles ADD COLUMN online_seconds INT NOT NULL DEFAULT 0');
      console.log('[Migration] Success! online_seconds column added.');
    } else {
      console.log('[Migration] Column online_seconds already exists.');
    }
  } catch (err) {
    console.error('[Migration] Failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
