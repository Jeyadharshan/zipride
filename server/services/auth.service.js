import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel } from '../models/user.model.js';
import { DriverModel } from '../models/driver.model.js';
import { VehicleModel } from '../models/vehicle.model.js';
import { signToken } from '../config/jwt.js';

export const AuthService = {
  async registerRider(data) {
    const { username, email, phone, fullName, dob, gender, passwordHash } = data;

    // Check unique constraints
    if (username) {
      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) throw new Error('Username is already taken.');
    }
    if (email) {
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) throw new Error('Email is already registered.');
    }
    if (phone) {
      const existingPhone = await UserModel.findByPhone(phone);
      if (existingPhone) throw new Error('Phone number is already registered.');
    }

    // Hash the password hash (the frontend SHA-256 hash or default fallback for OTP registration)
    const rawPass = (passwordHash && passwordHash.trim() !== '') ? passwordHash : 'default_otp_password_2026';
    const bcryptPasswordHash = await bcrypt.hash(rawPass, 10);
    const userId = crypto.randomUUID();

    const newUser = await UserModel.create({
      id: userId,
      email: email,
      full_name: fullName,
      role: 'rider',
      phone: phone,
      date_of_birth: dob,
      gender: gender,
      account_status: 'active',
      password_hash: bcryptPasswordHash,
      username: username ? username.toLowerCase() : null
    });

    const token = signToken({ id: newUser.id, role: newUser.role });

    return { user: newUser, token };
  },

  async login(usernameOrEmail, passwordHash, role = 'rider') {
    // 1. Find user by username or email
    let user = await UserModel.findByUsername(usernameOrEmail);
    if (!user) {
      user = await UserModel.findByEmail(usernameOrEmail);
    }

    if (!user || user.role !== role) {
      throw new Error('Invalid username, email, or credentials.');
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(passwordHash, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid username or password.');
    }

    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      throw new Error('Your account has been suspended or banned. Please contact support.');
    }

    const token = signToken({ id: user.id, role: user.role });

    return { user, token };
  },

  async registerDriver(data) {
    const {
      username,
      email,
      phone,
      fullName,
      licenseNumber,
      licenseExpiry,
      licenseImageUrl,
      rcBookUrl,
      insuranceUrl,
      profilePhotoUrl,
      selfieUrl,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      licensePlate,
      vehicleType,
      passwordHash
    } = data;

    // Check unique constraints
    if (username) {
      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) throw new Error('Username is already taken.');
    }
    if (email) {
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) throw new Error('Email is already registered.');
    }
    if (phone) {
      const existingPhone = await UserModel.findByPhone(phone);
      if (existingPhone) throw new Error('Phone number is already registered.');
    }

    const bcryptPasswordHash = await bcrypt.hash(passwordHash, 10);
    const userId = crypto.randomUUID();

    // 1. Create base User
    const newUser = await UserModel.create({
      id: userId,
      email,
      full_name: fullName,
      role: 'driver',
      phone,
      account_status: 'active',
      password_hash: bcryptPasswordHash,
      username: username ? username.toLowerCase() : null
    });

    // 2. Create Driver Profile
    const newDriver = await DriverModel.create({
      id: userId,
      status: 'offline',
      rating: 5.0,
      verification_status: 'pending',
      email,
      license_number: licenseNumber,
      license_expiry: licenseExpiry,
      license_image_url: licenseImageUrl,
      rc_book_url: rcBookUrl,
      insurance_url: insuranceUrl,
      profile_photo_url: profilePhotoUrl,
      selfie_url: selfieUrl,
      is_banned: 0
    });

    // 3. Create Driver Vehicle
    const vehicleId = crypto.randomUUID();
    await VehicleModel.create({
      id: vehicleId,
      driver_id: userId,
      make: vehicleMake,
      model: vehicleModel,
      year: parseInt(vehicleYear) || 2020,
      color: vehicleColor,
      license_plate: licensePlate,
      vehicle_type: vehicleType,
      is_active: 1
    });

    const token = signToken({ id: newUser.id, role: newUser.role });

    return { user: newUser, driver: newDriver, token };
  }
};
