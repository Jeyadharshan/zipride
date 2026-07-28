// backend/services/mongoService.js
// Singleton MongoDB Atlas service for driver documents and ride path tracking

import { connectMongoDB, getMongoDB } from '../config/mongodb.js';
import { formatAssetUrl } from '../utils/formatUrl.js';

export const MongoService = {
  async connect() {
    let db = getMongoDB();
    if (!db) {
      db = await connectMongoDB();
    }
    return db;
  },

  async saveDriverDocument(profileId, docType, url) {
    try {
      const database = await MongoService.connect();
      if (!database) return;
      const collection = database.collection('driver_documents');
      await collection.updateOne(
        { profile_id: profileId },
        { $set: { [docType]: url, updated_at: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.warn('[Mongo Service] Save driver document failed:', err.message);
    }
  },

  async getDriverDocuments(profileId) {
    try {
      const database = await MongoService.connect();
      if (!database) return null;
      const collection = database.collection('driver_documents');
      const doc = await collection.findOne({ $or: [{ profile_id: profileId }, { profileId: profileId }] });

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
    } catch (err) {
      console.warn('[Mongo Service] Get driver documents failed:', err.message);
    }
    return null;
  },

  async appendRidePath(rideId, driverId, lat, lng, speed = 0, heading = 0) {
    try {
      const database = await MongoService.connect();
      if (!database) return;
      await database.collection('ride_paths').updateOne(
        { ride_id: String(rideId) },
        {
          $set: { driver_id: driverId, updated_at: new Date() },
          $push: {
            path: {
              latitude: Number(lat),
              longitude: Number(lng),
              speed: Number(speed),
              heading: Number(heading),
              timestamp: new Date()
            }
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.warn('[Mongo Service] Record ride path failed:', err.message);
    }
  },

  async getRidePath(rideId) {
    try {
      const database = await MongoService.connect();
      if (!database) return null;
      return await database.collection('ride_paths').findOne({ ride_id: String(rideId) });
    } catch (err) {
      return null;
    }
  }
};

export default MongoService;
