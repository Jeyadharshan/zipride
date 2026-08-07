// backend/scripts/exportRides.js
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

async function exportRides() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Abirami@27',
    database: process.env.MYSQL_DATABASE || 'zipride',
  });
  try {
    const [rows] = await conn.execute(
      `SELECT r.id, r.status, r.fare, r.distance, r.duration, r.payment_method,
              r.payment_status, r.pickup_address, r.dropoff_address, r.created_at, r.completed_at,
              ru.username AS rider_username, du.username AS driver_username
       FROM rides r
       LEFT JOIN users ru ON r.rider_id = ru.id
       LEFT JOIN users du ON r.driver_id = du.id
       ORDER BY r.created_at DESC`
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(exportsDir, `rides_${timestamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
    console.log(`[Export] ✅ ${rows.length} rides exported to: ${outFile}`);
  } finally {
    await conn.end();
  }
}

exportRides().catch(err => { console.error('[Export] ❌', err.message); process.exit(1); });
