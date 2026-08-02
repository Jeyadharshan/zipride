import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Abirami@27',
  database: process.env.MYSQL_DATABASE || 'zipride',
};

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    const [profiles] = await conn.execute('SELECT id, username, full_name, role, email, phone, account_status FROM profiles');
    console.log(`Total profiles found: ${profiles.length}`);
    console.log(JSON.stringify(profiles, null, 2));

    const [driverProfiles] = await conn.execute('SELECT * FROM driver_profiles');
    console.log(`Total driver profiles: ${driverProfiles.length}`);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

main();
