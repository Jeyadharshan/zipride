// backend/scripts/exportUsers.js
// Exports all users to a JSON file in ./exports/
// Run: node scripts/exportUsers.js

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

async function exportUsers() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Abirami@27',
    database: process.env.MYSQL_DATABASE || 'zipride',
  });
  try {
    const [rows] = await conn.execute(
      'SELECT id, username, email, full_name, role, phone, account_status, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(exportsDir, `users_${timestamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
    console.log(`[Export] ✅ ${rows.length} users exported to: ${outFile}`);
  } finally {
    await conn.end();
  }
}

exportUsers().catch(err => { console.error('[Export] ❌', err.message); process.exit(1); });
