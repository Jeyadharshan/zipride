// backend/utils/envValidator.js
// Validates all required environment variables on server startup.
// Stops the process immediately if any required variable is missing.

const REQUIRED_VARS = [
  { key: 'MYSQL_HOST', description: 'MySQL server host' },
  { key: 'MYSQL_PORT', description: 'MySQL server port' },
  { key: 'MYSQL_USER', description: 'MySQL username' },
  { key: 'MYSQL_PASSWORD', description: 'MySQL password' },
  { key: 'MYSQL_DATABASE', description: 'MySQL database name' },
  { key: 'MONGODB_URI', description: 'MongoDB connection string' },
  { key: 'JWT_SECRET', description: 'JWT signing secret' },
];

export const validateEnv = () => {
  const missing = [];

  const checkVal = (key) => process.env[key];

  if (!checkVal('MYSQL_HOST')) missing.push('  ❌ MYSQL_HOST');
  if (!checkVal('MYSQL_PORT')) missing.push('  ❌ MYSQL_PORT');
  if (!checkVal('MYSQL_USER')) missing.push('  ❌ MYSQL_USER');
  if (!checkVal('MYSQL_PASSWORD')) missing.push('  ❌ MYSQL_PASSWORD');
  if (!checkVal('MYSQL_DATABASE')) missing.push('  ❌ MYSQL_DATABASE');
  if (!checkVal('MONGODB_URI') && !checkVal('MONGO_URI')) missing.push('  ❌ MONGODB_URI / MONGO_URI');
  if (!checkVal('JWT_SECRET')) missing.push('  ❌ JWT_SECRET');

  if (missing.length > 0) {
    console.error('\n[ENV Validator] ❌ Server startup aborted — missing required environment variables:\n');
    missing.forEach(m => console.error(m));
    console.error('\n[ENV Validator] Please check your environment configuration and provide all required keys.\n');
    process.exit(1);
  }
};

export default validateEnv;
