// scratch/check-tables.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

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
    console.log('Connected to MySQL.');

    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tables in database:');
    rows.forEach(r => console.log('-', Object.values(r)[0]));
  } catch (err) {
    console.error('Error listing tables:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
