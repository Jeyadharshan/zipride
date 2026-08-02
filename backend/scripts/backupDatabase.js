// backend/scripts/backupDatabase.js
// Creates a timestamped MySQL dump to the ./backups/ directory.
// Run: node scripts/backupDatabase.js

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `zipride_backup_${timestamp}.sql`;
const outputPath = path.join(backupsDir, filename);

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

const cmd = `mysqldump -h ${MYSQL_HOST || '127.0.0.1'} -P ${MYSQL_PORT || 3307} -u ${MYSQL_USER || 'root'} -p${MYSQL_PASSWORD || 'Abirami@27'} ${MYSQL_DATABASE || 'zipride'} > "${outputPath}"`;

console.log(`[Backup] Creating backup: ${filename}`);
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('[Backup] ❌ Failed:', error.message);
    process.exit(1);
  }
  console.log(`[Backup] ✅ Database backup saved to: ${outputPath}`);
});
