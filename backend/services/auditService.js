// backend/services/auditService.js
// Production MongoDB Atlas & MySQL Dual Audit Logging System

import db from '../config/db.js';
import { getMongoDB, connectMongoDB } from '../config/mongodb.js';

export const AuditService = {
  async log({ action, performed_by = 'SYSTEM', details = {}, profileId = null }) {
    const auditObj = {
      action,
      performed_by,
      details,
      profileId,
      timestamp: new Date()
    };

    // 1. Write to MongoDB Atlas audit_logs collection
    try {
      let mdb = getMongoDB();
      if (!mdb) mdb = await connectMongoDB();
      if (mdb) {
        await mdb.collection('audit_logs').insertOne(auditObj);
      }
    } catch (e) {}

    // 2. Write to MySQL audit_logs table
    try {
      await db.execute(
        `INSERT INTO audit_logs (profile_id, action, table_name, created_at) VALUES (?, ?, ?, NOW())`,
        [profileId, action, JSON.stringify(details).substring(0, 250)]
      ).catch(() => {});
    } catch (e) {}
  },

  async logAction(opts) {
    return AuditService.log({
      action: opts?.action,
      performed_by: opts?.profileId || 'SYSTEM',
      profileId: opts?.profileId,
      details: { tableName: opts?.tableName, recordId: opts?.recordId, notes: opts?.notes }
    });
  },

  async logAdminAction(opts) {
    return AuditService.log({
      action: opts?.action,
      performed_by: opts?.adminId || 'ADMIN',
      profileId: opts?.adminId || null,
      details: {
        affectedTable: opts?.affectedTable,
        affectedId: opts?.affectedId,
        ipAddress: opts?.ipAddress,
        ...(opts?.details || {})
      }
    });
  },

  async getRecentLogs({ limit = 50, offset = 0, action = null } = {}) {
    // MongoDB first
    try {
      let mdb = getMongoDB();
      if (!mdb) mdb = await connectMongoDB();
      if (mdb) {
        const query = action ? { action: new RegExp(action, 'i') } : {};
        const logs = await mdb.collection('audit_logs')
          .find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();
        if (logs.length > 0) return logs;
      }
    } catch (e) {}

    // MySQL fallback
    try {
      let sql = `SELECT al.*, p.full_name, p.role FROM audit_logs al LEFT JOIN profiles p ON al.profile_id = p.id ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
      const [rows] = await db.query(sql, [Number(limit), Number(offset)]);
      return rows;
    } catch (e) {
      return [];
    }
  }
};

export default AuditService;
