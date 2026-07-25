// backend/config/db.js
// MySQL connection pool — reads exclusively from environment variables.
// Aiven MySQL SSL support with "Require and Verify CA" (ca.pem, service.cert, service.key)

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required MySQL env vars with Aiven credentials fallback
const MYSQL_HOST     = process.env.MYSQL_HOST     || 'mysql-229b3785-zipride.c.aivencloud.com';
const MYSQL_PORT     = Number(process.env.MYSQL_PORT) || 15536;
const MYSQL_USER     = process.env.MYSQL_USER     || 'avnadmin';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'zipride';

/**
 * Resolves SSL configuration for Aiven MySQL with "Require and Verify CA".
 * Loads ca.pem, service.cert, and service.key from:
 * 1. Environment variables containing direct content (MYSQL_SSL_CA, MYSQL_SSL_CERT, MYSQL_SSL_KEY)
 * 2. Custom file paths in env (MYSQL_SSL_CA_PATH, MYSQL_SSL_CERT_PATH, MYSQL_SSL_KEY_PATH)
 * 3. Default directory locations (backend/certs/, backend/root, or current working directory)
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

  const hasCertFiles = Boolean(caFilePath || certFilePath || keyFilePath);

  // If SSL is not explicitly requested and no cert files/vars exist, fallback to default SSL
  if (!isExplicitSsl && !hasSslEnvVars && !hasCertFiles) {
    return { rejectUnauthorized: false };
  }

  // Content loading
  let caContent   = process.env.MYSQL_SSL_CA || process.env.MYSQL_CA_PEM;
  let certContent = process.env.MYSQL_SSL_CERT || process.env.MYSQL_SERVICE_CERT;
  let keyContent  = process.env.MYSQL_SSL_KEY || process.env.MYSQL_SERVICE_KEY;

  const missing = [];

  if (!caContent) {
    if (caFilePath) {
      caContent = fs.readFileSync(caFilePath, 'utf8');
    } else {
      missing.push('ca.pem (checked MYSQL_SSL_CA_PATH / backend/certs/ca.pem / env MYSQL_SSL_CA)');
    }
  }

  if (!certContent) {
    if (certFilePath) {
      certContent = fs.readFileSync(certFilePath, 'utf8');
    } else {
      missing.push('service.cert (checked MYSQL_SSL_CERT_PATH / backend/certs/service.cert / env MYSQL_SSL_CERT)');
    }
  }

  if (!keyContent) {
    if (keyFilePath) {
      keyContent = fs.readFileSync(keyFilePath, 'utf8');
    } else {
      missing.push('service.key (checked MYSQL_SSL_KEY_PATH / backend/certs/service.key / env MYSQL_SSL_KEY)');
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ [db.js] Aiven MySQL SSL Setup Error — Missing required certificate files or variables:');
    missing.forEach(item => console.error(`  • ${item}`));
    console.error('\nPlease place ca.pem, service.cert, and service.key in "backend/certs/" or provide environment variables.\n');
    
    if (isExplicitSsl || hasSslEnvVars) {
      throw new Error(`Aiven MySQL SSL Certificate Error: Missing ${missing.map(m => m.split(' ')[0]).join(', ')}`);
    }

    console.warn('⚠️ [db.js] Partial SSL certs found — falling back to unverified SSL connection.');
    return { rejectUnauthorized: false };
  }

  console.log('🔒 [db.js] Aiven MySQL SSL configured with "Require and Verify CA" (ca.pem, service.cert, service.key loaded successfully).');

  return {
    ca: caContent,
    cert: certContent,
    key: keyContent,
    rejectUnauthorized: true // Require and Verify CA
  };
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
  console.log(`[db.js] Connecting to MySQL at ${MYSQL_HOST}:${MYSQL_PORT} (database: ${MYSQL_DATABASE}) …`);

  pool = mysql.createPool(connectionConfig);

  const conn = await pool.getConnection();
  
  // Ensure 'zipride' database exists if specified
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`zipride\``);
  } catch (e) {}

  conn.release();

  console.log(`✅ MySQL Connected — host: ${MYSQL_HOST}:${MYSQL_PORT}, database: ${MYSQL_DATABASE}`);

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
