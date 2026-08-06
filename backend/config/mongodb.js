// backend/config/mongodb.js
// MongoDB connection using Mongoose

import mongoose from "mongoose";
import dns from "dns";

// Ensure reliable SRV DNS lookup for MongoDB Atlas on Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fallback silent catch
}

let isConnected = false;

export async function connectMongoDB() {
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    console.warn('⚠️  MONGODB_URI environment variable is missing.');
    return null;
  }

  // Already connected singleton
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }

  const tryConnect = async (uri) => {
    return mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  };

  try {
    await tryConnect(mongoUri);
    isConnected = true;
    console.log('✅ MongoDB Connected');
    return mongoose.connection.db;
  } catch (err) {
    // Retry with authSource=admin if initial attempt had authentication issues
    if (err.message.includes('auth') || err.message.includes('Authentication')) {
      if (!mongoUri.includes('authSource=')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        const retryUri = `${mongoUri}${separator}authSource=admin`;
        try {
          await tryConnect(retryUri);
          isConnected = true;
          console.log('✅ MongoDB Connected (with authSource=admin)');
          return mongoose.connection.db;
        } catch (retryErr) {
          err = retryErr;
        }
      }
    }

    isConnected = false;
    if (err.message.includes('auth') || err.message.includes('Authentication')) {
      console.log('ℹ️  MongoDB: Optional secondary database offline (Atlas authentication skipped) — primary app running on TiDB Cloud MySQL.');
    } else {
      console.log(`ℹ️  MongoDB: Optional secondary database offline (${err.message}) — primary app running on TiDB Cloud MySQL.`);
    }
    return null;
  }
}


// Get MongoDB instance
export function getMongoDB() {

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }

  return null;
}


// Alias function
export function getDB() {
  return getMongoDB();
}


// Check connection status
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}


// Close MongoDB connection
export async function closeMongoDB() {

  try {

    if (mongoose.connection.readyState !== 0) {

      await mongoose.disconnect();

      isConnected = false;

      console.log("✅ MongoDB Disconnected");

    }

  } catch (err) {

    console.error(
      `❌ MongoDB Disconnect Failed: ${err.message}`
    );

  }
}


export default connectMongoDB;
