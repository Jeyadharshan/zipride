import { DriverRepository } from '../repositories/driverRepository.js';
import { logRideLocation } from '../repositories/mongoRepository.js';
import { formatAssetUrl } from '../utils/formatUrl.js';

export const DriverController = {
  async getProfile(req, res, next) {
    try {
      const driver = await DriverRepository.findById(req.user.id);
      const vehicle = await DriverRepository.getVehicle(req.user.id);
      
      const formattedPhoto = formatAssetUrl(driver?.profile_photo || driver?.profile_photo_url || driver?.profile_image);
      const formattedLicense = formatAssetUrl(driver?.driving_licence_image);

      return res.json({
        success: true,
        message: 'Driver profile retrieved.',
        data: {
          ...driver,
          profile_photo: formattedPhoto,
          profile_photo_url: formattedPhoto,
          driving_licence_image: formattedLicense,
          license_image_url: formattedLicense,
          vehicle
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const updated = await DriverRepository.updateDriver(req.user.id, updates);
      return res.json({
        success: true,
        message: 'Driver details updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async getVehicle(req, res, next) {
    try {
      const vehicle = await DriverRepository.getVehicle(req.user.id);
      return res.json({
        success: true,
        message: 'Active vehicle retrieved.',
        data: vehicle
      });
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req, res, next) {
    try {
      const { latitude, longitude, heading, rideId } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
      }

      await DriverRepository.updateLocation(req.user.id, latitude, longitude, heading || 0);

      // Log location history to MongoDB (geospatial 2dsphere collection)
      logRideLocation({
        rideId: rideId || 'general',
        driverId: req.user.id,
        latitude,
        longitude,
        heading: heading || 0
      });

      return res.json({
        success: true,
        message: 'Current location updated.',
        data: { latitude, longitude, heading: heading || 0 }
      });
    } catch (err) {
      next(err);
    }
  },

  async uploadDocuments(req, res, next) {
    try {
      const profileId = req.user.id;
      const profilePhotoUrl = req.files?.profilePhoto?.[0]?.cloudinaryUrl || req.body.profilePhotoUrl;
      const licenseImageUrl = req.files?.licenseImage?.[0]?.cloudinaryUrl || req.body.licenseImageUrl;
      const drivingLicenceNumber = req.body.drivingLicenceNumber || req.body.licenseNumber;

      const fieldsToUpdate = [];
      const values = [];

      if (profilePhotoUrl) {
        fieldsToUpdate.push('profile_photo = ?');
        values.push(profilePhotoUrl);
        // Also sync user profiles profile_image
        await db.query(`UPDATE profiles SET profile_image = ? WHERE id = ?`, [profilePhotoUrl, profileId]).catch(() => {});
      }
      if (licenseImageUrl) {
        fieldsToUpdate.push('driving_licence_image = ?');
        values.push(licenseImageUrl);
      }
      if (drivingLicenceNumber) {
        fieldsToUpdate.push('driving_licence_number = ?', 'license_number = ?');
        values.push(drivingLicenceNumber, drivingLicenceNumber);
      }

      // Reset verification status to Pending when new documents are uploaded
      fieldsToUpdate.push("verification_status = 'Pending'", "rejection_reason = NULL", "updated_at = NOW()");

      if (fieldsToUpdate.length > 0) {
        values.push(profileId);
        await db.query(
          `UPDATE driver_profiles SET ${fieldsToUpdate.join(', ')} WHERE profile_id = ?`,
          values
        );
      }

      return res.json({
        success: true,
        message: 'Documents uploaded and resubmitted for admin verification successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
};
