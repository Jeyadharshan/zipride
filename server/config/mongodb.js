import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Accept multiple common env var names to be flexible across deploy targets
const rawUri = (process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || '').trim();
const DEFAULT_LOCAL = 'mongodb://localhost:27017';
const MONGO_URI = rawUri !== '' ? rawUri : DEFAULT_LOCAL;
const DB_NAME = process.env.MONGO_DB || process.env.MONGODB_DB || 'zipride';

let client;
let db;

const maskConnectionString = (uri) => {
  try {
    // Try to reuse URL to remove credentials when possible (works for mongodb+srv format)
    const asUrl = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    return `mongodb://${asUrl.host}`;
  } catch (e) {
    return uri.replace(/:(.+)@/, ':*****@');
  }
};

export const connectMongoDB = async (opts = {}) => {
  if (db) return db;

  const maxRetries = Number.isInteger(opts.retries) ? opts.retries : 2;
  const retryDelay = (attempt) => 500 * Math.pow(2, attempt);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      db = client.db(DB_NAME);
      console.log('[MongoDB] Connected successfully to', maskConnectionString(MONGO_URI));
      return db;
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      if (attempt < maxRetries) {
        console.warn(`[MongoDB] Connection attempt ${attempt + 1} failed: ${msg}. Retrying in ${retryDelay(attempt)}ms...`);
        await new Promise((r) => setTimeout(r, retryDelay(attempt)));
        continue;
      }

      // Final failure: log non-sensitive summary and return null so app can continue in degraded mode
      console.error('[MongoDB] Connection error (final):', msg);
      return null;
    }
  }

  return null;
};

export const getDB = () => {
  if (!db) {
    throw new Error('[MongoDB] Database not initialized. Call connectMongoDB first.');
  }
  return db;
};

export const isDBConnected = () => !!db;

export default connectMongoDB;
