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
      const profilePhotoFile = req.files?.profilePhoto?.[0];
      const licenseImageFile = req.files?.licenseImage?.[0];
      const rcBookFile = req.files?.rcBook?.[0];
      const aadhaarFile = req.files?.aadhaar?.[0];
      const panFile = req.files?.pan?.[0];
      const vehicleImageFile = req.files?.vehicleImage?.[0];

      const rawProfilePhoto = profilePhotoFile?.cloudinaryUrl || req.body.profilePhotoUrl || req.body.profilePhoto;
      const rawLicenseImage = licenseImageFile?.cloudinaryUrl || req.body.licenseImageUrl || req.body.licenseImage;
      const rawRcBook = rcBookFile?.cloudinaryUrl || req.body.rcBookUrl || req.body.rcBook;
      const rawAadhaar = aadhaarFile?.cloudinaryUrl || req.body.aadhaarUrl || req.body.aadhaar;
      const rawPan = panFile?.cloudinaryUrl || req.body.panUrl || req.body.pan;
      const rawVehicleImage = vehicleImageFile?.cloudinaryUrl || req.body.vehicleImageUrl || req.body.vehicleImage;

      const drivingLicenceNumber = req.body.drivingLicenceNumber || req.body.licenseNumber;

      const profilePhotoUrl = formatAssetUrl(rawProfilePhoto);
      const licenseImageUrl = formatAssetUrl(rawLicenseImage);
      const rcBookUrl = formatAssetUrl(rawRcBook);
      const aadhaarUrl = formatAssetUrl(rawAadhaar);
      const panUrl = formatAssetUrl(rawPan);
      const vehicleImageUrl = formatAssetUrl(rawVehicleImage);

      const newPublicIds = {};
      if (profilePhotoFile?.publicId) newPublicIds.profilePhoto = profilePhotoFile.publicId;
      if (licenseImageFile?.publicId) newPublicIds.drivingLicense = licenseImageFile.publicId;
      if (rcBookFile?.publicId) newPublicIds.rcBook = rcBookFile.publicId;
      if (aadhaarFile?.publicId) newPublicIds.aadhaar = aadhaarFile.publicId;
      if (panFile?.publicId) newPublicIds.pan = panFile.publicId;
      if (vehicleImageFile?.publicId) newPublicIds.vehicleImage = vehicleImageFile.publicId;

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

      // Reset verification status to Pending and clear rejection_reason
      fieldsToUpdate.push("verification_status = 'Pending'", "rejection_reason = NULL", "updated_at = NOW()");

      if (fieldsToUpdate.length > 0) {
        values.push(profileId);
        await db.query(
          `UPDATE driver_profiles SET ${fieldsToUpdate.join(', ')} WHERE profile_id = ?`,
          values
        );
      }

      // Update driver_documents in MySQL if available
      try {
        const [dpRows] = await db.query('SELECT id FROM driver_profiles WHERE profile_id = ?', [profileId]);
        if (dpRows && dpRows.length > 0) {
          const driverIntId = dpRows[0].id;
          await db.query('INSERT IGNORE INTO driver_documents (driver_id) VALUES (?)', [driverIntId]);
          const docUpdateFields = [];
          const docValues = [];
          if (profilePhotoUrl) { docUpdateFields.push('profile_photo = ?'); docValues.push(profilePhotoUrl); }
          if (licenseImageUrl) { docUpdateFields.push('license_photo = ?'); docValues.push(licenseImageUrl); }
          if (rcBookUrl) { docUpdateFields.push('rc_book_photo = ?'); docValues.push(rcBookUrl); }
          if (docUpdateFields.length > 0) {
            docValues.push(driverIntId);
            await db.query(`UPDATE driver_documents SET ${docUpdateFields.join(', ')} WHERE driver_id = ?`, docValues);
          }
        }
      } catch (err) {
        console.warn('[driverController] MySQL driver_documents update failed:', err.message);
      }

      // Sync MongoDB document record
      try {
        const { default: DocumentService } = await import('../services/documentService.js');
        await DocumentService.updateDriverDocuments(profileId, {
          profilePhoto: profilePhotoUrl,
          drivingLicense: licenseImageUrl,
          rcBook: rcBookUrl,
          aadhaar: aadhaarUrl,
          pan: panUrl,
          vehicleImage: vehicleImageUrl,
          licenseNumber: drivingLicenceNumber,
          status: 'pending',
          newPublicIds
        });
      } catch (err) {
        console.warn('[driverController] Failed to sync MongoDB documents on upload:', err.message);
      }

      // Notify Admin of document resubmission
      try {
        const { NotificationService } = await import('../services/notificationService.js');
        await NotificationService.sendPushNotification(
          'admin',
          'New Driver Documents Submitted',
          `Driver ${req.user.full_name || profileId} has resubmitted verification documents.`
        ).catch(() => {});
      } catch (err) {}

      return res.json({
        success: true,
        message: 'Documents uploaded and resubmitted for admin verification successfully.',
        data: {
          verification_status: 'Pending',
          profile_photo: profilePhotoUrl,
          profile_photo_url: profilePhotoUrl,
          driving_licence_image: licenseImageUrl,
          license_image_url: licenseImageUrl,
          rc_book_url: rcBookUrl,
          aadhaar_url: aadhaarUrl,
          pan_url: panUrl,
          vehicle_image_url: vehicleImageUrl,
          driving_licence_number: drivingLicenceNumber
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getDriverWallet(req, res, next) {
    try {
      const { WalletRepository } = await import('../repositories/walletRepository.js');
      const data = await WalletRepository.getDriverWallet(req.user.id);
      return res.json({
        success: true,
        message: 'Driver wallet details retrieved.',
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getSettlement(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const data = await SettlementService.getDriverSettlementSummary(req.user.id);
      return res.json({
        success: true,
        message: 'Driver settlement summary retrieved.',
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async requestSettlement(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const result = await SettlementService.requestSettlement(req.user.id, req.body);
      return res.json({
        success: true,
        message: 'Settlement request submitted.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};
