import DocumentRepository from '../repositories/documentRepository.js';
import DriverDocument from '../models/DriverDocument.js';
import Logger from '../utils/logger.js';

class DocumentService {
    async createDriverDocument(driverId, profileId, driverData, profilePhotoUrl, drivingLicenseUrl) {
        try {
            const document = new DriverDocument({
                driverId,
                profileId,
                driverName: driverData.fullName,
                phone: driverData.phone,
                email: driverData.email,
                licenseNumber: driverData.licenseNumber,
                profilePhoto: profilePhotoUrl,
                drivingLicense: drivingLicenseUrl,
                verificationStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await DocumentRepository.save(document.toJSON());
            Logger.info(`Created driver document for profile: ${profileId}`);
            return document;
        } catch (error) {
            Logger.error(`Failed to create driver document: ${error.message}`);
            throw error;
        }
    }

    async getDriverDocumentByProfileId(profileId) {
        try {
            const document = await DocumentRepository.findByProfileId(profileId);
            return document;
        } catch (error) {
            Logger.error(`Failed to fetch driver document: ${error.message}`);
            throw error;
        }
    }

    async getDriverDocumentByDriverId(driverId) {
        try {
            const document = await DocumentRepository.findByDriverId(driverId);
            return document;
        } catch (error) {
            Logger.error(`Failed to fetch driver document by driver ID: ${error.message}`);
            throw error;
        }
    }

    async updateVerificationStatus(profileId, status, adminId = null, reason = null) {
        try {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                throw new Error('Invalid verification status');
            }

            await DocumentRepository.updateStatus(profileId, status, adminId, reason);
            Logger.info(`Updated verification status for profile ${profileId} to ${status}`);
            
            return await this.getDriverDocumentByProfileId(profileId);
        } catch (error) {
            Logger.error(`Failed to update verification status: ${error.message}`);
            throw error;
        }
    }

    async updateProfilePhoto(profileId, photoUrl) {
        try {
            const collection = await DocumentRepository.getCollection();
            await collection.updateOne(
                { profileId },
                { $set: { profilePhoto: photoUrl, updatedAt: new Date() } }
            );
            Logger.info(`Updated profile photo for driver: ${profileId}`);
        } catch (error) {
            Logger.error(`Failed to update profile photo: ${error.message}`);
            throw error;
        }
    }

    async updateDrivingLicense(profileId, licenseUrl) {
        try {
            const collection = await DocumentRepository.getCollection();
            await collection.updateOne(
                { profileId },
                { $set: { drivingLicense: licenseUrl, updatedAt: new Date() } }
            );
            Logger.info(`Updated driving license for driver: ${profileId}`);
        } catch (error) {
            Logger.error(`Failed to update driving license: ${error.message}`);
            throw error;
        }
    }

    async updateDriverDocuments(profileId, { profilePhoto, drivingLicense, licenseNumber, status = 'pending' }) {
        try {
            const collection = await DocumentRepository.getCollection();
            const updateFields = {
                verificationStatus: status,
                rejectedReason: null,
                updatedAt: new Date()
            };
            if (profilePhoto) updateFields.profilePhoto = profilePhoto;
            if (drivingLicense) updateFields.drivingLicense = drivingLicense;
            if (licenseNumber) updateFields.licenseNumber = licenseNumber;

            await collection.updateOne(
                { profileId },
                { $set: updateFields },
                { upsert: true }
            );
            Logger.info(`Updated driver documents for profile: ${profileId}`);
        } catch (error) {
            Logger.error(`Failed to update driver documents: ${error.message}`);
        }
    }

    async getAllPendingDocuments() {
        try {
            const collection = await DocumentRepository.getCollection();
            return await collection.find({ verificationStatus: 'pending' }).toArray();
        } catch (error) {
            Logger.error(`Failed to fetch pending documents: ${error.message}`);
            throw error;
        }
    }

    async getAllDocuments() {
        try {
            return await DocumentRepository.getAll();
        } catch (error) {
            Logger.error(`Failed to fetch all documents: ${error.message}`);
            throw error;
        }
    }
}

export default new DocumentService();
