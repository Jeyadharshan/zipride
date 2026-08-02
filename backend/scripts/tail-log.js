// backend/scripts/tail-log.js
import fs from 'fs';
import path from 'path';

const logPath = path.resolve('logs/api.log');

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n');
  console.log(`Last 50 lines of api.log (total lines: ${lines.length}):`);
  lines.slice(-50).forEach(l => console.log(l));
} catch (err) {
  console.error('Error reading log:', err.message);
}
