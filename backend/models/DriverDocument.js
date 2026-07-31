class DriverDocument {
    constructor(data) {
        this.driverId = data.driverId; // MySQL driver_profiles.id (integer)
        this.profileId = data.profileId; // MySQL profiles.id (UUID)
        this.driverName = data.driverName;
        this.phone = data.phone;
        this.email = data.email;
        this.licenseNumber = data.licenseNumber;
        this.profilePhoto = data.profilePhoto; // Cloudinary URL
        this.drivingLicense = data.drivingLicense; // Cloudinary URL
        this.rcBook = data.rcBook || null; // Cloudinary URL
        this.aadhaar = data.aadhaar || null; // Cloudinary URL
        this.pan = data.pan || null; // Cloudinary URL
        this.vehicleImage = data.vehicleImage || null; // Cloudinary URL
        this.insurancePhoto = data.insurancePhoto || null; // Cloudinary URL
        this.selfiePhoto = data.selfiePhoto || null; // Cloudinary URL
        this.publicIds = data.publicIds || data.public_ids || {}; // Map of fieldName -> Cloudinary public_id
        this.verificationStatus = data.verificationStatus || 'pending';
        this.approvedBy = data.approvedBy || null;
        this.approvedAt = data.approvedAt || null;
        this.rejectedReason = data.rejectedReason || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    static fromJSON(json) {
        return new DriverDocument(json);
    }

    toJSON() {
        return {
            driverId: this.driverId,
            profileId: this.profileId,
            driverName: this.driverName,
            phone: this.phone,
            email: this.email,
            licenseNumber: this.licenseNumber,
            profilePhoto: this.profilePhoto,
            drivingLicense: this.drivingLicense,
            rcBook: this.rcBook,
            aadhaar: this.aadhaar,
            pan: this.pan,
            vehicleImage: this.vehicleImage,
            insurancePhoto: this.insurancePhoto,
            selfiePhoto: this.selfiePhoto,
            publicIds: this.publicIds,
            verificationStatus: this.verificationStatus,
            approvedBy: this.approvedBy,
            approvedAt: this.approvedAt,
            rejectedReason: this.rejectedReason,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

export default DriverDocument;
