// backend/scripts/migrateUploadsToCloudinary.js
// Migration Script: Migrate existing local /uploads/... files to Cloudinary

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../config/database.js';
import { getMongoDB, connectMongoDB } from '../config/mongodb.js';
import CloudinaryService from '../services/cloudinaryService.js';
import { GridFSService } from '../services/gridfsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsBaseDir = path.resolve(__dirname, '../uploads');

async function migrateUploads() {
  console.log('====================================================');
  console.log('🚀 STARTING MIGRATION OF LOCAL /uploads TO CLOUDINARY');
  console.log('====================================================');

  if (!CloudinaryService.isConfigured()) {
    console.error('❌ Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env before running migration.');
    process.exit(1);
  }

  let migratedCount = 0;
  let missingCount = 0;

  // 1. Helper to find file on disk or GridFS and upload to Cloudinary
  async function uploadToCloudinaryIfLocal(rawUrl, folder = 'zipride_migrated_docs') {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
    const cleanUrl = rawUrl.trim();

    // Already a Cloudinary or remote http(s) URL
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('cloudinary.com')) {
        return { url: cleanUrl, publicId: null, status: 'already_cloudinary' };
      }
    }

    let filename = cleanUrl.split('/').pop().split('?')[0];
    let localPath = path.join(uploadsBaseDir, filename);
    let fileBuffer = null;

    // Check local disk
    if (fs.existsSync(localPath)) {
      fileBuffer = fs.readFileSync(localPath);
    } else {
      // Check GridFS
      try {
        let gridFile = null;
        if (filename.length === 24 && /^[0-9a-fA-F]{24}$/.test(filename)) {
          gridFile = await GridFSService.getFileStream(filename);
        }
        if (!gridFile) {
          gridFile = await GridFSService.getFileStreamByFilename(filename);
        }

        if (gridFile && gridFile.downloadStream) {
          const chunks = [];
          for await (const chunk of gridFile.downloadStream) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
        }
      } catch (e) {}
    }

    if (fileBuffer) {
      const uploadRes = await CloudinaryService.uploadImage(fileBuffer, folder);
      if (uploadRes) {
        migratedCount++;
        return { url: uploadRes.url, publicId: uploadRes.publicId, status: 'migrated' };
      }
    }

    missingCount++;
    console.warn(`⚠️ Local file not found for migration: ${cleanUrl}`);
    return { url: null, publicId: null, status: 'missing' };
  }

  // 2. Migrate MySQL driver_profiles
  try {
    console.log('\n📦 Migrating MySQL driver_profiles...');
    const [drivers] = await db.query('SELECT id, profile_id, profile_photo, driving_licence_image FROM driver_profiles');
    for (const d of drivers) {
      let photoRes = null;
      let licenseRes = null;

      if (d.profile_photo && d.profile_photo.includes('/uploads/')) {
        photoRes = await uploadToCloudinaryIfLocal(d.profile_photo, 'zipride_driver_profiles');
        if (photoRes?.url) {
          await db.query('UPDATE driver_profiles SET profile_photo = ? WHERE id = ?', [photoRes.url, d.id]);
          await db.query('UPDATE profiles SET profile_image = ? WHERE id = ?', [photoRes.url, d.profile_id]);
          console.log(`  [driver_profiles ID ${d.id}] Profile photo migrated -> ${photoRes.url}`);
        }
      }

      if (d.driving_licence_image && d.driving_licence_image.includes('/uploads/')) {
        licenseRes = await uploadToCloudinaryIfLocal(d.driving_licence_image, 'zipride_driver_licenses');
        if (licenseRes?.url) {
          await db.query('UPDATE driver_profiles SET driving_licence_image = ? WHERE id = ?', [licenseRes.url, d.id]);
          console.log(`  [driver_profiles ID ${d.id}] License image migrated -> ${licenseRes.url}`);
        }
      }
    }
  } catch (err) {
    console.error('Error migrating MySQL driver_profiles:', err.message);
  }

  // 3. Migrate MySQL driver_documents
  try {
    console.log('\n📦 Migrating MySQL driver_documents...');
    const [docs] = await db.query('SELECT id, driver_id, profile_photo, selfie_photo, license_photo, rc_book_photo, insurance_photo FROM driver_documents');
    for (const doc of docs) {
      const updates = [];
      const vals = [];

      for (const field of ['profile_photo', 'selfie_photo', 'license_photo', 'rc_book_photo', 'insurance_photo']) {
        const val = doc[field];
        if (val && val.includes('/uploads/')) {
          const res = await uploadToCloudinaryIfLocal(val, `zipride_${field}`);
          if (res?.url) {
            updates.push(`${field} = ?`);
            vals.push(res.url);
            console.log(`  [driver_documents ID ${doc.id}] ${field} migrated -> ${res.url}`);
          }
        }
      }

      if (updates.length > 0) {
        vals.push(doc.id);
        await db.query(`UPDATE driver_documents SET ${updates.join(', ')} WHERE id = ?`, vals);
      }
    }
  } catch (err) {
    console.error('Error migrating MySQL driver_documents:', err.message);
  }

  // 4. Migrate MongoDB driver_documents
  try {
    console.log('\n📦 Migrating MongoDB driver_documents...');
    let mongoDb = getMongoDB();
    if (!mongoDb) mongoDb = await connectMongoDB();

    if (mongoDb) {
      const col = mongoDb.collection('driver_documents');
      const docs = await col.find({}).toArray();

      for (const doc of docs) {
        const setFields = {};
        const publicIds = doc.publicIds || doc.public_ids || {};

        const fieldsToCheck = [
          { key: 'profilePhoto', alt: ['profile_photo', 'profile_photo_url'] },
          { key: 'drivingLicense', alt: ['license_photo', 'license_image_url'] },
          { key: 'rcBook', alt: ['rc_book_photo', 'rc_book_url'] },
          { key: 'aadhaar', alt: ['aadhaar_photo', 'aadhaar_url'] },
          { key: 'pan', alt: ['pan_photo', 'pan_url'] },
          { key: 'vehicleImage', alt: ['vehicle_photo', 'vehicle_image_url'] },
        ];

        for (const f of fieldsToCheck) {
          const raw = doc[f.key] || doc[f.alt[0]] || doc[f.alt[1]];
          if (raw && typeof raw === 'string' && raw.includes('/uploads/')) {
            const res = await uploadToCloudinaryIfLocal(raw, `zipride_${f.key}`);
            if (res?.url) {
              setFields[f.key] = res.url;
              f.alt.forEach(altKey => { setFields[altKey] = res.url; });
              if (res.publicId) publicIds[f.key] = res.publicId;
              console.log(`  [MongoDB doc ID ${doc._id}] ${f.key} migrated -> ${res.url}`);
            }
          }
        }

        if (Object.keys(setFields).length > 0) {
          setFields.publicIds = publicIds;
          setFields.public_ids = publicIds;
          setFields.updatedAt = new Date();
          await col.updateOne({ _id: doc._id }, { $set: setFields });
        }
      }
    }
  } catch (err) {
    console.error('Error migrating MongoDB driver_documents:', err.message);
  }

  console.log('\n====================================================');
  console.log(`✅ MIGRATION COMPLETED!`);
  console.log(`📊 Successfully Migrated: ${migratedCount} files`);
  console.log(`⚠️ Missing Local Files: ${missingCount} files (will display "Image not available")`);
  console.log('====================================================');
  process.exit(0);
}

migrateUploads();
