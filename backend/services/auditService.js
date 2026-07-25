// backend/services/auditService.js
// Production audit logging — captures every significant system action

import db from '../config/db.js';

export const AuditService = {
  /**
   * Log any action to the audit_logs table.
   * @param {object} opts
   * @param {string}  opts.profileId   - UUID of the user performing the action
   * @param {string}  opts.action      - Action identifier (e.g. 'RIDE_ACCEPTED', 'DRIVER_APPROVED')
   * @param {string}  [opts.tableName] - Affected table name
   * @param {string}  [opts.recordId]  - Affected record ID
   * @param {string}  [opts.ipAddress] - Requester's IP address
   * @param {string}  [opts.userAgent] - Browser / User-Agent string
   * @param {string}  [opts.notes]     - Additional notes
   */
  async logAction({ profileId, action, tableName = null, recordId = null, ipAddress = null, userAgent = null, notes = null }) {
    try {
      let validProfileId = null;
      if (profileId && typeof profileId === 'string' && profileId.length === 36 && profileId !== 'admin') {
        const [[p]] = await db.execute('SELECT id FROM profiles WHERE id = ?', [profileId]);
        if (p?.id) validProfileId = p.id;
      }
      await db.execute(
        `INSERT INTO audit_logs (profile_id, action, table_name, record_id, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [validProfileId, action, tableName, recordId]
      );
    } catch (err) {
      // Audit must NEVER crash the calling code
      console.error('[Audit Service] Failed to write log:', err.message);
    }
  },

  // Convenience alias used by some legacy controller code
  async logAdminAction({ adminId, action, affectedId, affectedTable, ipAddress, userAgent }) {
    return AuditService.logAction({
      profileId: adminId,
      action,
      tableName: affectedTable,
      recordId: affectedId,
      ipAddress,
      userAgent,
    });
  },

  async getRecentLogs({ limit = 50, offset = 0, profileId = null, action = null } = {}) {
    let sql = `
      SELECT al.*, p.full_name, p.role
      FROM audit_logs al
      LEFT JOIN profiles p ON al.profile_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (profileId) {
      sql += ` AND al.profile_id = ?`;
      params.push(profileId);
    }
    if (action) {
      sql += ` AND al.action LIKE ?`;
      params.push(`%${action}%`);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async countLogs(profileId = null, action = null) {
    let sql = `SELECT COUNT(*) AS total FROM audit_logs WHERE 1=1`;
    const params = [];
    if (profileId) { sql += ` AND profile_id = ?`; params.push(profileId); }
    if (action)    { sql += ` AND action LIKE ?`;  params.push(`%${action}%`); }
    const [[row]] = await db.execute(sql, params);
    return row.total;
  },
};

export default AuditService;
