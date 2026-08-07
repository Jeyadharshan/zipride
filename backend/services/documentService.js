import DocumentRepository from '../repositories/documentRepository.js';
import DriverDocument from '../models/DriverDocument.js';
import CloudinaryService from './cloudinaryService.js';
import Logger from '../utils/logger.js';

class DocumentService {
    async createDriverDocument(driverId, profileId, driverData, profilePhotoUrl, drivingLicenseUrl, publicIds = {}) {
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
                rcBook: driverData.rcBookUrl || driverData.rcBook || null,
                aadhaar: driverData.aadhaarUrl || driverData.aadhaar || null,
                pan: driverData.panUrl || driverData.pan || null,
                vehicleImage: driverData.vehicleImageUrl || driverData.vehicleImage || null,
                insurancePhoto: driverData.insuranceUrl || driverData.insurancePhoto || null,
                selfiePhoto: driverData.selfieUrl || driverData.selfiePhoto || null,
                publicIds,
                verificationStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const docJson = document.toJSON();
            docJson.profile_photo = profilePhotoUrl;
            docJson.profile_photo_url = profilePhotoUrl;
            docJson.license_photo = drivingLicenseUrl;
            docJson.license_image_url = drivingLicenseUrl;
            docJson.public_ids = publicIds;

            await DocumentRepository.save(docJson);
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

    async updateDriverDocuments(profileId, docData) {
        try {
            const existingDoc = await DocumentRepository.findByProfileId(profileId);
            const existingPublicIds = existingDoc?.publicIds || existingDoc?.public_ids || {};
            const updatedPublicIds = { ...existingPublicIds };

            const {
                profilePhoto,
                drivingLicense,
                rcBook,
                aadhaar,
                pan,
                vehicleImage,
                insurancePhoto,
                selfiePhoto,
                licenseNumber,
                status = 'pending',
                newPublicIds = {}
            } = docData;

            const collection = await DocumentRepository.getCollection();
            const updateFields = {
                verificationStatus: status,
                rejectedReason: null,
                updatedAt: new Date()
            };

            // Helper to handle field replacement & Cloudinary cleanup
            const handleFieldUpdate = async (fieldName, newUrl, altNames = []) => {
                if (newUrl) {
                    const oldPublicId = existingPublicIds[fieldName];
                    const newPublicId = newPublicIds[fieldName];
                    if (oldPublicId && newPublicId && oldPublicId !== newPublicId) {
                        await CloudinaryService.deleteImage(oldPublicId).catch(() => {});
                    }
                    if (newPublicId) {
                        updatedPublicIds[fieldName] = newPublicId;
                    }
                    updateFields[fieldName] = newUrl;
                    altNames.forEach(alt => { updateFields[alt] = newUrl; });
                }
            };

            await handleFieldUpdate('profilePhoto', profilePhoto, ['profile_photo', 'profile_photo_url']);
            await handleFieldUpdate('drivingLicense', drivingLicense, ['license_photo', 'license_image_url']);
            await handleFieldUpdate('rcBook', rcBook, ['rc_book_photo', 'rc_book_url']);
            await handleFieldUpdate('aadhaar', aadhaar, ['aadhaar_photo', 'aadhaar_url']);
            await handleFieldUpdate('pan', pan, ['pan_photo', 'pan_url']);
            await handleFieldUpdate('vehicleImage', vehicleImage, ['vehicle_photo', 'vehicle_image_url']);
            await handleFieldUpdate('insurancePhoto', insurancePhoto, ['insurance_photo', 'insurance_url']);
            await handleFieldUpdate('selfiePhoto', selfiePhoto, ['selfie_photo', 'selfie_url']);

            if (licenseNumber) updateFields.licenseNumber = licenseNumber;
            updateFields.publicIds = updatedPublicIds;
            updateFields.public_ids = updatedPublicIds;

            if (collection) {
                await collection.updateOne(
                    { profileId },
                    { $set: updateFields },
                    { upsert: true }
                );
            } else {
                await DocumentRepository.save({ profileId, ...updateFields });
            }
            Logger.info(`Updated driver documents for profile: ${profileId}`);
        } catch (error) {
            Logger.error(`Failed to update driver documents: ${error.message}`);
        }
    }

    async deleteDriverDocuments(profileId) {
        try {
            const existingDoc = await DocumentRepository.findByProfileId(profileId);
            if (existingDoc) {
                const publicIds = existingDoc.publicIds || existingDoc.public_ids || {};
                for (const pid of Object.values(publicIds)) {
                    if (pid) {
                        await CloudinaryService.deleteImage(pid).catch(() => {});
                    }
                }
                await DocumentRepository.deleteByProfileId(profileId);
                Logger.info(`Deleted driver documents and Cloudinary assets for profile: ${profileId}`);
            }
        } catch (error) {
            Logger.error(`Failed to delete driver documents: ${error.message}`);
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
