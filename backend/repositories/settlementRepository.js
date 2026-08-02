import db from '../config/db.js';

export const SettlementRepository = {
  async createRequest({ driverId, profileId, amount, paymentMethod = 'Bank Transfer', bankDetails = '', notes = '' }) {
    const [result] = await db.execute(
      `INSERT INTO driver_settlements (driver_id, profile_id, amount, status, payment_method, bank_details, notes, created_at)
       VALUES (?, ?, ?, 'Pending', ?, ?, ?, NOW())`,
      [driverId, profileId, amount, paymentMethod, bankDetails, notes]
    );
    return result.insertId;
  },

  async getDriverSettlements(profileId) {
    const [rows] = await db.execute(
      `SELECT ds.*, dp.id AS driver_num_id
       FROM driver_settlements ds
       LEFT JOIN driver_profiles dp ON (ds.driver_id = dp.id OR ds.profile_id = dp.profile_id)
       WHERE ds.profile_id = ? OR ds.driver_id = (SELECT id FROM driver_profiles WHERE profile_id = ? LIMIT 1)
       ORDER BY ds.created_at DESC`,
      [profileId, profileId]
    );
    return rows;
  },

  async getAllSettlements({ status = '', search = '' } = {}) {
    let sql = `
      SELECT ds.*, p.full_name, p.phone, p.email
      FROM driver_settlements ds
      LEFT JOIN profiles p ON ds.profile_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      sql += ` AND ds.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (p.full_name LIKE ? OR p.phone LIKE ? OR ds.id LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    sql += ` ORDER BY ds.created_at DESC`;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async updateStatus(settlementId, status, notes = '', txnReference = '') {
    const isSettled = status === 'Approved' || status === 'Settled' || status === 'Paid';
    if (isSettled) {
      await db.execute(
        `UPDATE driver_settlements SET status = ?, notes = ?, settled_at = NOW() WHERE id = ?`,
        [status, notes, settlementId]
      );
    } else {
      await db.execute(
        `UPDATE driver_settlements SET status = ?, notes = ?, settled_at = NULL WHERE id = ?`,
        [status, notes, settlementId]
      );
    }
    const [[updated]] = await db.execute(`SELECT * FROM driver_settlements WHERE id = ?`, [settlementId]);
    return updated;
  }
};

export default SettlementRepository;
