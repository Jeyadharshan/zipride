// backend/config/database.js
// MySQL connection config — reads exclusively from environment variables.
// No hardcoded hosts, credentials, or database names.

import dotenv from 'dotenv';
dotenv.config();

export const dbConfig = {
  host:     process.env.MYSQL_HOST,
  port:     parseInt(process.env.MYSQL_PORT, 10),
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,

  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 10,
  waitForConnections: true,
  queueLimit: 0,

  // Named timezone conversion
  timezone: '+05:30',

  // Slow query threshold (ms) — log any query taking longer
  slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 500,
};

export default dbConfig;
