// backend/scripts/dump_mysql_schema.js
// Utility to automatically reverse engineer and dump the MySQL 8.0 DDL schemas for all tables.
// Run: node scripts/dump_mysql_schema.js

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
    conn = await mysql.createConnection(dbConfig);
    console.log('[Dump Schema] Connected to database.');

    // Query all tables
    const [tables] = await conn.execute('SHOW TABLES');
    if (tables.length === 0) {
      console.log('[Dump Schema] No tables found to dump.');
      return;
    }
    
    const tableKey = Object.keys(tables[0])[0];
    const tableNames = tables.map(t => t[tableKey]);

    let sqlContent = `-- ZipRide MySQL 8.0 Database Schema
-- Generated dynamically on ${new Date().toISOString()}

CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;
USE \`${dbConfig.database}\`;

SET FOREIGN_KEY_CHECKS = 0;

`;

    for (const tableName of tableNames) {
      const [[createRow]] = await conn.execute(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createRow['Create Table'];
      sqlContent += `-- ------------------------------------------------------\n`;
      sqlContent += `-- Table structure for table \`${tableName}\`\n`;
      sqlContent += `-- ------------------------------------------------------\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlContent += `${createTableSql};\n\n`;
      console.log(`✅ Dumped table DDL: ${tableName}`);
    }

    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const outputPath = path.resolve('./schema.sql');
    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    console.log(`\n🎉 MySQL schema dump complete! Saved to ${outputPath}\n`);
  } catch (err) {
    console.error('[Dump Schema] ❌ Error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
