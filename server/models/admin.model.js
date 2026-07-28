import { dbGet, dbRun, dbAll } from '../config/database.js';

export const AdminModel = {
  async getSettings() {
    const rows = await dbAll('SELECT * FROM admin_settings');
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  async updateSetting(key, value) {
    await dbRun(
      `INSERT INTO admin_settings (key, value, updated_at) 
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value]
    );
    return dbGet('SELECT * FROM admin_settings WHERE key = ?', [key]);
  },

  async logAction(auditData) {
    const { id, admin_id, action, details } = auditData;
    await dbRun(
      `INSERT INTO admin_audit_logs (id, admin_id, action, details)
       VALUES (?, ?, ?, ?)`,
      [id, admin_id, action, details]
    );
    return dbGet('SELECT * FROM admin_audit_logs WHERE id = ?', [id]);
  }
};
