// backend/scripts/clearDatabase.js
// Safe utility to truncate all database tables (deleting all records, but preserving table schemas).
// Run: node scripts/clearDatabase.js

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

async function clearDatabase() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('[Clear DB] Connected to database. Fetching tables...');

    // Get all tables
    const [tables] = await conn.execute('SHOW TABLES');
    if (tables.length === 0) {
      console.log('[Clear DB] No tables found in the database. Nothing to clear.');
      return;
    }

    const tableKey = Object.keys(tables[0])[0];
    const tableNames = tables.map(t => t[tableKey]);

    console.log(`[Clear DB] Found ${tableNames.length} tables to truncate.`);

    // Disable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔑 Disabled foreign key checks.');

    for (const tableName of tableNames) {
      await conn.execute(`TRUNCATE TABLE \`${tableName}\``);
      console.log(`🧹 Truncated table: ${tableName}`);
    }

    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔑 Re-enabled foreign key checks.');

    console.log('\n🎉 Successfully cleared all data from all database tables!\n');
  } catch (err) {
    console.error('[Clear DB] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

clearDatabase();
