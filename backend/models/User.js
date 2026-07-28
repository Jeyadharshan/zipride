export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.fullName = data.full_name || '';
    this.role = data.role || 'rider';
    this.phone = data.phone || '';
    this.avatarUrl = data.avatar_url || '';
    this.dateOfBirth = data.date_of_birth || null;
    this.gender = data.gender || '';
    this.passwordHash = data.password_hash || '';
    this.username = data.username || '';
    this.accountStatus = data.account_status || 'active';
    this.createdAt = data.created_at || null;
    this.updatedAt = data.updated_at || null;
  }

  static validate(data) {
    const errors = [];
    if (!data.email) errors.push('Email is required.');
    if (!data.phone) errors.push('Phone is required.');
    if (!data.fullName) errors.push('Full name is required.');
    if (!data.username) errors.push('Username is required.');
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
export default User;
