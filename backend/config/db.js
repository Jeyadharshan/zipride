// backend/config/db.js
// MySQL connection pool — reads exclusively from environment variables.
// Aiven MySQL SSL support with "Require and Verify CA" (ca.pem, service.cert, service.key)

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required MySQL env vars with TiDB Cloud credentials fallback
const MYSQL_HOST     = process.env.MYSQL_HOST     || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const MYSQL_PORT     = Number(process.env.MYSQL_PORT) || 4000;
const MYSQL_USER     = process.env.MYSQL_USER     || 'cBAXK2TmpioAcwS.root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '9B7vqd4Ze5YvGkUV';
const rawDb = process.env.MYSQL_DATABASE || 'zipride';
const MYSQL_DATABASE = (!rawDb || rawDb === 'github_sample') ? 'zipride' : rawDb;

/**
 * Resolves SSL configuration for TiDB Cloud / Aiven / Standard MySQL.
 */
function resolveSslConfig() {
  const isExplicitSsl = process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL_REQUIRED === 'true';
  const hasSslEnvVars = Boolean(
    process.env.MYSQL_SSL_CA || process.env.MYSQL_CA_PEM ||
    process.env.MYSQL_SSL_CA_PATH || process.env.MYSQL_SSL_CERT_PATH || process.env.MYSQL_SSL_KEY_PATH
  );

  // Search paths for cert files
  const searchDirs = [
    path.resolve(__dirname, '../certs'),
    path.resolve(__dirname, '..'),
    process.cwd()
  ];

  const findCertFile = (fileName, customEnvPath) => {
    if (customEnvPath && fs.existsSync(customEnvPath)) {
      return customEnvPath;
    }
    for (const dir of searchDirs) {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  };

  const caFilePath   = findCertFile('ca.pem', process.env.MYSQL_SSL_CA_PATH);
  const certFilePath = findCertFile('service.cert', process.env.MYSQL_SSL_CERT_PATH);
  const keyFilePath  = findCertFile('service.key', process.env.MYSQL_SSL_KEY_PATH);

  // Content loading
  let caContent   = process.env.MYSQL_SSL_CA || process.env.MYSQL_CA_PEM;
  let certContent = process.env.MYSQL_SSL_CERT || process.env.MYSQL_SERVICE_CERT;
  let keyContent  = process.env.MYSQL_SSL_KEY || process.env.MYSQL_SERVICE_KEY;

  if (caFilePath && !caContent) caContent = fs.readFileSync(caFilePath, 'utf8');
  if (certFilePath && !certContent) certContent = fs.readFileSync(certFilePath, 'utf8');
  if (keyFilePath && !keyContent) keyContent = fs.readFileSync(keyFilePath, 'utf8');

  if (caContent) {
    console.log('🔒 [db.js] SSL configured using CA cert file/variable.');
    const sslObj = { ca: caContent, rejectUnauthorized: false };
    if (certContent) sslObj.cert = certContent;
    if (keyContent) sslObj.key = keyContent;
    return sslObj;
  }

  const isCloudHost = MYSQL_HOST.includes('tidbcloud.com') || MYSQL_HOST.includes('aivencloud.com') || MYSQL_PORT === 4000;

  if (isCloudHost || isExplicitSsl || hasSslEnvVars) {
    return { minVersion: 'TLSv1.2', rejectUnauthorized: false };
  }

  return { rejectUnauthorized: false };
}

const sslOption = resolveSslConfig();

const connectionConfig = {
  host:     MYSQL_HOST,
  port:     MYSQL_PORT,
  user:     MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,

  ssl: sslOption,

  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
};

let pool;
let isFallback = false;

try {
  pool = mysql.createPool(connectionConfig);

  const conn = await pool.getConnection();
  
  // Ensure database exists if specified
  try {
    if (MYSQL_DATABASE) {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\``);
    }
  } catch (e) {}

  conn.release();

  console.log('✅ TiDB Connected');

} catch (err) {
  console.error(`❌ MySQL Connection Failed: ${err.message}`);

  if (process.env.NODE_ENV === 'production') {
    console.error('[db.js] Production environment — refusing to continue without a real MySQL connection.');
    process.exit(1);
  }

  // Development only: warn and continue with a no-op mock so the process stays alive
  // for local work without a running MySQL instance.
  console.warn('[db.js] ⚠️  Development mode — falling back to mock DB pool. Queries will return empty results.');

  pool = {
    isMock: true,

    async execute(sql, params = []) {
      console.warn(`[Mock Execute] SQL: ${sql}`, params);
      return [[], []];
    },

    async query(sql, params = []) {
      console.warn(`[Mock Query] SQL: ${sql}`, params);
      return [[], []];
    },

    async getConnection() {
      return {
        execute: async (sql, params = []) => {
          console.warn(`[Mock Conn Execute] SQL: ${sql}`, params);
          return [[], []];
        },

        query: async (sql, params = []) => {
          console.warn(`[Mock Conn Query] SQL: ${sql}`, params);
          return [[], []];
        },

        beginTransaction: async () => {
          console.log('[Mock Transaction] Begin');
        },

        commit: async () => {
          console.log('[Mock Transaction] Commit');
        },

        rollback: async () => {
          console.log('[Mock Transaction] Rollback');
        },

        release: () => {}
      };
    }
  };

  isFallback = true;
}

export const getDb = () => pool;

export const isMockActive = () => isFallback;

export default pool;
