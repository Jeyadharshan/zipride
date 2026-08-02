// backend/config/app.js
// Central application configuration module

import dotenv from 'dotenv';
dotenv.config();

export const appConfig = {
  name: 'ZipRide Production API',
  version: '1.0.0',
  port: parseInt(process.env.PORT) || 5000,
  env: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'],
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB) || 10,
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
  slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 500,
};

export default appConfig;
