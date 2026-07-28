// backend/repositories/authRepository.js
// All SQL for authentication — uses actual schema: profiles, admins tables

import db from '../config/db.js';
import crypto from 'crypto';

export const AuthRepository = {
  // Find user by username, email, or phone
  async findByIdentifier(identifier) {
    const [rows] = await db.execute(
      `SELECT p.*, a.admin_role, a.can_manage_users, a.can_manage_drivers, a.can_manage_rides,
              a.can_manage_wallet, a.can_manage_payments, a.can_view_reports
       FROM profiles p
       LEFT JOIN admins a ON p.id = a.profile_id
       WHERE p.username = ? OR p.email = ? OR p.phone = ?
       LIMIT 1`,
      [identifier, identifier, identifier]
    );
    return rows[0] || null;
  },

  // Find user by username, email, or phone AND role
  async findByIdentifierAndRole(identifier, role) {
    const [rows] = await db.execute(
      `SELECT p.*, a.admin_role, a.can_manage_users, a.can_manage_drivers, a.can_manage_rides,
              a.can_manage_wallet, a.can_manage_payments, a.can_view_reports
       FROM profiles p
       LEFT JOIN admins a ON p.id = a.profile_id
       WHERE (p.username = ? OR p.email = ? OR p.phone = ?) AND p.role = ?
       LIMIT 1`,
      [identifier, identifier, identifier, role]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM profiles WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    if (!email || typeof email !== 'string' || !email.trim()) return null;
    const [rows] = await db.execute(
      `SELECT * FROM profiles WHERE email = ? LIMIT 1`,
      [email.trim()]
    );
    return rows[0] || null;
  },

  async findByPhone(phone) {
    if (!phone || typeof phone !== 'string' || !phone.trim()) return null;
    const [rows] = await db.execute(
      `SELECT * FROM profiles WHERE RIGHT(REPLACE(phone, ' ', ''), 10) = RIGHT(REPLACE(?, ' ', ''), 10) LIMIT 1`,
      [phone.trim()]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    if (!username || typeof username !== 'string' || !username.trim()) return null;
    const [rows] = await db.execute(
      `SELECT * FROM profiles WHERE username = ? LIMIT 1`,
      [username.trim()]
    );
    return rows[0] || null;
  },

  async createProfile(data) {
    const {
      id, firebase_uid = null, username, password_hash, full_name,
      phone, email, role = 'rider', referral_code = null,
    } = data;
    await db.execute(
      `INSERT INTO profiles (id, firebase_uid, username, password_hash, full_name, phone, email, role, referral_code, account_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [id, firebase_uid, username, password_hash, full_name, phone, email, role, referral_code]
    );
    return id;
  },

  // createRider: creates profile + auto-wallet for a rider
  async createRider(data) {
    const {
      id, email, fullName, phone, dob, gender, passwordHash, username
    } = data;

    const cleanUsername = (username && username.trim()) ? username.trim() : null;
    const cleanEmail = (email && email.trim()) ? email.trim() : null;
    const cleanPhone = (phone && phone.trim()) ? phone.trim() : null;
    const cleanDob = (dob && dob.trim()) ? dob.trim() : null;
    const cleanGender = (gender && gender.trim()) ? gender.trim() : null;

    // Generate a unique referral code safely
    const seed = (cleanUsername || fullName || cleanEmail || 'RIDER').replace(/[^a-zA-Z0-9]/g, '');
    const cleanSeed = (seed.substring(0, 4) || 'RIDE').toUpperCase().padEnd(4, 'X');
    const referralCode = `ZR${cleanSeed}${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute(
      `INSERT INTO profiles (id, username, password_hash, full_name, phone, email, role, referral_code, date_of_birth, gender, account_status, phone_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'rider', ?, ?, ?, 'active', 0, NOW(), NOW())`,
      [id, cleanUsername, passwordHash || null, fullName || null, cleanPhone, cleanEmail, referralCode, cleanDob, cleanGender]
    );

    // Auto-create wallet
    await db.execute(
      `INSERT IGNORE INTO wallets (profile_id, wallet_balance, wallet_status, created_at, updated_at)
       VALUES (?, 0.00, 'Active', NOW(), NOW())`,
      [id]
    );

    // Return created profile
    const [rows] = await db.execute(`SELECT * FROM profiles WHERE id = ? LIMIT 1`, [id]);
    return rows[0];
  },

  async updateLastLogin(id) {
    await db.execute(
      `UPDATE profiles SET last_login = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );
  },

  async updatePassword(id, passwordHash) {
    await db.execute(
      `UPDATE profiles SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [passwordHash, id]
    );
  },

  async findByReferralCode(code) {
    const [rows] = await db.execute(
      `SELECT id FROM profiles WHERE referral_code = ? LIMIT 1`,
      [code]
    );
    return rows[0] || null;
  },

  async getAccountStatus(id) {
    const [rows] = await db.execute(
      `SELECT account_status FROM profiles WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0]?.account_status || null;
  },
};

export default AuthRepository;
