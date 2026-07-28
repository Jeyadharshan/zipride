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
