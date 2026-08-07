import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../logs');

// Create logs directory if not exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const writeLog = (filename, level, message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  const filePath = path.join(logsDir, filename);
  
  // Console logging
  if (level === 'error') {
    console.error(logLine.trim());
  } else {
    console.log(logLine.trim());
  }

  // File logging
  try {
    fs.appendFileSync(filePath, logLine);
    fs.appendFileSync(path.join(logsDir, 'combined.log'), logLine);
  } catch (err) {
    console.error('[Logger Error] Failed appending to log file:', err.message);
  }
};

export const Logger = {
  info(message) {
    writeLog('combined.log', 'info', message);
  },
  
  error(message, errorStack = '') {
    const msg = errorStack ? `${message} | Stack: ${errorStack}` : message;
    writeLog('error.log', 'error', msg);
  },
  
  api(message) {
    writeLog('api.log', 'api', message);
  },
  
  payment(message) {
    writeLog('payment.log', 'payment', message);
  },
  
  socket(message) {
    writeLog('socket.log', 'socket', message);
  }
};

export default Logger;
