// backend/scripts/exportDrivers.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

async function exportDrivers() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Abirami@27',
    database: process.env.MYSQL_DATABASE || 'zipride',
  });
  try {
    const [rows] = await conn.execute(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.account_status,
              d.status, d.rating, d.verification_status, d.license_number, d.is_banned,
              v.make, v.model, v.license_plate, v.vehicle_type
       FROM users u
       JOIN drivers d ON u.id = d.id
       LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = 1
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(exportsDir, `drivers_${timestamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
    console.log(`[Export] ✅ ${rows.length} drivers exported to: ${outFile}`);
  } finally {
    await conn.end();
  }
}

exportDrivers().catch(err => { console.error('[Export] ❌', err.message); process.exit(1); });
