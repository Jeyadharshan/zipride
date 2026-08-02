// backend/scripts/init_mysql_db.js
// Utility to initialize the MySQL database schema by executing backend/schema.sql.
// Run: node scripts/init_mysql_db.js

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Abirami@27',
  database: process.env.MYSQL_DATABASE || 'zipride',
};

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true
    });
    console.log('[Init DB] Connected to database.');

    const schemaPath = path.resolve('./schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[Init DB] Restoring schema from schema.sql...');
    await conn.query(sql);
    console.log('✅ MySQL schema successfully loaded into database!');
  } catch (err) {
    console.error('[Init DB] ❌ Error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
