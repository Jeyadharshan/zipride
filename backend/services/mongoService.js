// backend/services/mongoService.js
// Production MongoDB driver service with local JSON fallback for driver documents (Profile Photo & Driving License URLs)

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { formatAssetUrl } from '../utils/formatUrl.js';
dotenv.config();

let client = null;
let db = null;
let isMongoUnreachable = false;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'zipride';

export const MongoService = {
  async connect() {
    if (isMongoUnreachable) return null;
    if (client && db) return db;
    try {
      client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      db = client.db(MONGO_DB);
      console.log('[Mongo Service] Successfully connected to MongoDB.');
      return db;
    } catch (err) {
      client = null;
      db = null;
      isMongoUnreachable = true;
      console.warn('[Mongo Service] MongoDB connection failed (falling back to local JSON data storage instantly for performance):', err.message);
      return null;
    }
  },

  async saveDriverDocument(profileId, docType, url) {
    const database = await MongoService.connect();
    if (database) {
      try {
        const collection = database.collection('driver_documents');
        await collection.updateOne(
          { profile_id: profileId },
          { $set: { [docType]: url, updated_at: new Date() } },
          { upsert: true }
        );
        console.log(`[Mongo Service] Saved ${docType} to MongoDB for profile: ${profileId}`);
        return;
      } catch (err) {
        console.error('[Mongo Service] Failed to save to MongoDB:', err.message);
      }
    }

    // Fallback to local JSON storage
    try {
      const dataDir = path.resolve('data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, 'mongo_mock.json');
      let data = {};
      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      if (!data[profileId]) {
        data[profileId] = {};
      }
      data[profileId][docType] = url;
      data[profileId].updated_at = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Mongo Service] Saved ${docType} to local JSON fallback for profile: ${profileId}`);
    } catch (err) {
      console.error('[Mongo Service] Fallback storage failed:', err.message);
    }
  },

  async getDriverDocuments(profileId) {
    const database = await MongoService.connect();
    let doc = null;
    if (database) {
      try {
        const collection = database.collection('driver_documents');
        doc = await collection.findOne({ $or: [{ profile_id: profileId }, { profileId: profileId }] });
      } catch (err) {
        console.error('[Mongo Service] Failed to fetch from MongoDB:', err.message);
      }
    }

    if (!doc) {
      // Fallback
      try {
        const filePath = path.resolve('data/mongo_mock.json');
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          doc = data[profileId] || null;
        }
      } catch (err) {
        console.error('[Mongo Service] Fallback fetch failed:', err.message);
      }
    }

    if (doc) {
      const rawProfilePhoto = doc.profilePhoto || doc.profile_photo_url || doc.profile_photo || null;
      const rawLicensePhoto = doc.drivingLicense || doc.license_image_url || doc.license_photo || null;
      const formattedProfilePhoto = formatAssetUrl(rawProfilePhoto);
      const formattedLicensePhoto = formatAssetUrl(rawLicensePhoto);

      return {
        ...doc,
        profilePhoto: formattedProfilePhoto,
        profile_photo: formattedProfilePhoto,
        profile_photo_url: formattedProfilePhoto,
        drivingLicense: formattedLicensePhoto,
        license_image_url: formattedLicensePhoto,
      };
    }
    return null;
  }
};

export default MongoService;
