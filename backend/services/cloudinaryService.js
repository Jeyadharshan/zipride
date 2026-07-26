// backend/services/cloudinaryService.js
// Cloudinary Cloud Storage & Auto-Cleanup Service

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// Configure Cloudinary if credentials exist
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

export const CloudinaryService = {
  isConfigured() {
    return isCloudinaryConfigured;
  },

  async uploadImage(fileBufferOrPath, folder = 'zipride_uploads', oldPublicId = null) {
    if (!isCloudinaryConfigured) {
      console.log('[CloudinaryService] Credentials missing — falling back to persistent MongoDB storage.');
      return null;
    }

    try {
      // If replacing an existing image, auto-delete the old image
      if (oldPublicId) {
        await this.deleteImage(oldPublicId).catch(() => {});
      }

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            overwrite: true
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(fileBufferOrPath);
      });

      console.log(`[CloudinaryService] ✅ Image Uploaded: ${uploadResult.secure_url}`);
      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        bytes: uploadResult.bytes,
        format: uploadResult.format
      };
    } catch (err) {
      console.warn('[CloudinaryService] Upload failed:', err.message);
      return null;
    }
  },

  async deleteImage(publicId) {
    if (!isCloudinaryConfigured || !publicId) return false;
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      console.log(`[CloudinaryService] 🗑️ Image Deleted: ${publicId}`);
      return res.result === 'ok';
    } catch (err) {
      console.warn(`[CloudinaryService] Delete image failed for ${publicId}:`, err.message);
      return false;
    }
  }
};

export default CloudinaryService;
