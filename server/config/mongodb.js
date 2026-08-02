import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'zipride';

let client;
let db;

export const connectMongoDB = async () => {
  if (db) return db;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[MongoDB] Connected successfully to Atlas/local.');
    return db;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    throw error;
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('[MongoDB] Database not initialized. Call connectMongoDB first.');
  }
  return db;
};

export const isDBConnected = () => {
  return !!db;
};

export default connectMongoDB;
