// test-db.js — Quick MySQL connection test
// Run from project root: node test-db.js

import mysql from 'mysql2/promise';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = path.join(__dirname, 'backend', '.env');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
  console.log('[Test] Loaded environment from backend/.env');
} catch {
  console.warn('[Test] Could not load backend/.env — using defaults');
}

const host = process.env.MYSQL_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const port = parseInt(process.env.MYSQL_PORT) || 4000;

const config = {
  host,
  port,
  user:     process.env.MYSQL_USER     || 'cBAXK2TmpioAcwS.root',
  password: process.env.MYSQL_PASSWORD || '9B7vqd4Ze5YvGkUV',
  database: process.env.MYSQL_DATABASE || 'zipride',
  ssl:      (host.includes('tidbcloud') || port === 4000) ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined
};

console.log(`\n[Test] Connecting to MySQL...`);
console.log(`  Host    : ${config.host}`);
console.log(`  Port    : ${config.port}`);
console.log(`  User    : ${config.user}`);
console.log(`  Database: ${config.database}\n`);

let conn;
try {
  conn = await mysql.createConnection(config);
  console.log('✅ Connected to MySQL successfully!\n');

  // Show MySQL version
  const [[versionRow]] = await conn.execute('SELECT VERSION() as version');
  console.log(`   MySQL Version : ${versionRow.version}`);

  // Show all tables in the database
  const [tables] = await conn.execute('SHOW TABLES');
  if (tables.length === 0) {
    console.warn('\n⚠️  Database is empty — no tables found. Run the schema migration first.');
  } else {
    console.log(`   Tables Found  : ${tables.length}`);
    const tableKey = Object.keys(tables[0])[0];
    const tableNames = tables.map(t => t[tableKey]);
    console.log('\n   Tables:\n  ', tableNames.join('\n   '));
  }

  // Quick check for core tables
  const coreTables = ['profiles', 'driver_profiles', 'rides', 'wallets', 'payments', 'notifications'];
  const existing = tables.map(t => Object.values(t)[0]);
  const missing = coreTables.filter(t => !existing.includes(t));

  if (missing.length > 0) {
    console.warn(`\n⚠️  Missing core tables: ${missing.join(', ')}`);
    console.warn('   Run the schema SQL file to create them.');
  } else {
    console.log('\n✅ All core tables present (profiles, driver_profiles, rides, wallets, payments, notifications)');
  }

  console.log('\n[Test] Connection test complete.\n');
} catch (err) {
  console.error('\n❌ Connection FAILED:\n');
  console.error(`   Code    : ${err.code || 'UNKNOWN'}`);
  console.error(`   Message : ${err.message}`);
  
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\n   → Wrong username or password. Check MYSQL_USER / MYSQL_PASSWORD in backend/.env');
  } else if (err.code === 'ECONNREFUSED') {
    console.error(`\n   → MySQL is not running on ${config.host}:${config.port}`);
    console.error('   → Make sure MySQL service is started (Services > MySQL80 or MySQL)');
  } else if (err.code === 'ER_BAD_DB_ERROR') {
    console.error(`\n   → Database "${config.database}" does not exist.`);
    console.error(`   → Create it: mysql -u root -p -e "CREATE DATABASE ${config.database}"`);
  }
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
