import { dbGet, dbRun, dbAll } from '../config/database.js';

export const UserModel = {
  async findById(id) {
    return dbGet('SELECT * FROM users WHERE id = ?', [id]);
  },

  async findByUsername(username) {
    return dbGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  },

  async findByEmail(email) {
    return dbGet('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  },

  async findByPhone(phone) {
    return dbGet('SELECT * FROM users WHERE phone = ?', [phone]);
  },

  async findByFirebaseUid(uid) {
    return dbGet('SELECT * FROM users WHERE firebase_uid = ?', [uid]);
  },

  async create(userData) {
    const {
      id,
      email,
      full_name,
      avatar_url,
      role = 'rider',
      phone,
      firebase_uid,
      date_of_birth,
      gender,
      referral_code,
      address,
      account_status = 'active',
      password_hash,
      username
    } = userData;

    await dbRun(
      `INSERT INTO users (
        id, email, full_name, avatar_url, role, phone, firebase_uid,
        date_of_birth, gender, referral_code, address, account_status,
        password_hash, username
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, email, full_name, avatar_url, role, phone, firebase_uid,
        date_of_birth, gender, referral_code, address, account_status,
        password_hash, username
      ]
    );

    // Automatically create a wallet for a newly registered user
    try {
      await dbRun('INSERT OR IGNORE INTO wallets (id, balance) VALUES (?, 0.00)', [id]);
    } catch (wErr) {
      console.error('[UserModel] Error creating wallet during user registration:', wErr.message);
    }

    return this.findById(id);
  },

  async update(id, updates) {
    const fields = [];
    const values = [];

    // Dynamically build SET query fields
    Object.keys(updates).forEach((key) => {
      // Exclude fields that shouldn't be updated dynamically
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);

    // Add updated_at
    fields.push("updated_at = datetime('now')");
    values.push(id); // for WHERE id = ?

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await dbRun(sql, values);

    return this.findById(id);
  },

  async getAll(role = null) {
    if (role) {
      return dbAll('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC', [role]);
    }
    return dbAll('SELECT * FROM users ORDER BY created_at DESC');
  }
};
