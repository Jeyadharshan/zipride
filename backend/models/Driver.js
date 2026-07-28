export class Driver {
  constructor(data = {}) {
    this.id = data.id || null;
    this.status = data.status || 'offline';
    this.rating = data.rating || 5.0;
    this.verificationStatus = data.verification_status || 'pending';
    this.email = data.email || '';
    this.licenseNumber = data.license_number || '';
    this.licenseExpiry = data.license_expiry || null;
    this.licenseImageUrl = data.license_image_url || '';
    this.rcBookUrl = data.rc_book_url || '';
    this.insuranceUrl = data.insurance_url || '';
    this.profilePhotoUrl = data.profile_photo_url || '';
    this.selfieUrl = data.selfie_url || '';
    this.currentLatitude = data.current_latitude || null;
    this.currentLongitude = data.current_longitude || null;
    this.isBanned = data.is_banned || 0;
    this.lastActiveAt = data.last_active_at || null;
  }

  static validateDocs(data) {
    const errors = [];
    if (!data.licenseNumber) errors.push('License number is required.');
    if (!data.licenseImageUrl) errors.push('License image upload is required.');
    if (!data.rcBookUrl) errors.push('RC book upload is required.');
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
export default Driver;
