// backend/scripts/restoreDatabase.js
// Restores a MySQL database from a dump file.
// Run: node scripts/restoreDatabase.js ./backups/zipride_backup_2026-xx-xx.sql

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const dumpFile = process.argv[2];

if (!dumpFile) {
  console.error('[Restore] ❌ Usage: node scripts/restoreDatabase.js <path-to-backup.sql>');
  process.exit(1);
}

const resolvedPath = path.resolve(dumpFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`[Restore] ❌ Backup file not found: ${resolvedPath}`);
  process.exit(1);
}

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;
const cmd = `mysql -h ${MYSQL_HOST || '127.0.0.1'} -P ${MYSQL_PORT || 3307} -u ${MYSQL_USER || 'root'} -p${MYSQL_PASSWORD || 'Abirami@27'} ${MYSQL_DATABASE || 'zipride'} < "${resolvedPath}"`;

console.log(`[Restore] Restoring from: ${resolvedPath}`);
exec(cmd, (error) => {
  if (error) {
    console.error('[Restore] ❌ Failed:', error.message);
    process.exit(1);
  }
  console.log('[Restore] ✅ Database restored successfully.');
});
