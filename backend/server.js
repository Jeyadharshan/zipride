import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Environment validation — must run before anything else
import { validateEnv } from './utils/envValidator.js';
dotenv.config();
validateEnv();

// Global BigInt serialization helper to prevent JSON.stringify crashes on BIGINT columns
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// Config imports
import { getDb, isMockActive } from './config/db.js';
import { connectMongoDB, getMongoDB } from './config/mongodb.js';
import { ensureMongoIndexes } from './repositories/mongoRepository.js';
import { initializeSocket, getOnlineDriverCount } from './socket/socket.js';
import { CronService } from './services/cronService.js';
import { runDatabaseMigrations } from './utils/dbMigrate.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import riderRoutes from './routes/riderRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

// Controller imports for dynamic compatibility query
import { AdminController } from './controllers/adminController.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { loginLimiter, otpLimiter, rideLimiter, paymentLimiter, adminLimiter, generalLimiter } from './middleware/rateLimiter.js';
import requestTimeout from './middleware/requestTimeout.js';
import upload from './middleware/upload.js';
// dotenv already loaded above with env validation

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// 1. Logs directory initialization
const logsDir = path.resolve(__dirname, './logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 2. Upload directories initialization (Drivers, Vehicles, Profiles, etc.)
const uploadSubDirs = ['drivers', 'vehicles', 'profiles', 'licenses', 'insurance', 'rc', 'selfie', 'trips'];
const uploadsBaseDir = path.resolve(__dirname, './uploads');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}
uploadSubDirs.forEach((dir) => {
  const subDir = path.join(uploadsBaseDir, dir);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
});

// 3. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
// Allowed origins: comma-separated list from env, plus hardcoded Vercel deployment domain.
// In production set CORS_ORIGINS on Render to:
//   https://zipride-khaki.vercel.app,https://zipride-1.onrender.com
const ALLOWED_ORIGINS = [
  ...(process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  'https://zipride-khaki.vercel.app',  // primary Vercel production URL
  'http://localhost:5173',             // local dev (Vite)
  'http://localhost:3000',             // local dev (CRA / fallback)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (e.g. server-to-server, curl, Render health checks)
    if (!origin) return callback(null, true);

    // Allow the exact origin or any *.vercel.app preview deployment for this project
    const allowed =
      ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/zipride(-[\w-]+)?\.vercel\.app$/.test(origin);

    if (allowed) {
      callback(null, origin); // reflect the requesting origin (required for credentials)
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
    }
  },
  exposedHeaders: ['X-JWT-Token'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204 for OPTIONS
}));

// Explicitly handle all OPTIONS preflight requests before any other middleware
app.options('*', cors());

// Request timeout (prevents resource exhaustion from slow clients)
app.use(requestTimeout());

// Route-specific rate limiting
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/send-otp', otpLimiter);
app.use('/api/v1/rides', rideLimiter);
app.use('/api/v1/payments', paymentLimiter);
app.use('/api/v1/admin', adminLimiter);
app.use('/api/', generalLimiter);

// 4. Request Logging (Morgan)
const apiLogStream = fs.createWriteStream(path.join(logsDir, 'api.log'), { flags: 'a' });
app.use(morgan('combined', { stream: apiLogStream }));
app.use(morgan('dev')); // Console log requests

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded media with cross-origin CORS support and fallback placeholder for missing files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsBaseDir, filename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // If the file does not exist on disk, return a clean SVG placeholder image instead of "Cannot GET /uploads/..."
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background:#f1f5f9;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`);
});

app.use('/uploads', express.static(uploadsBaseDir, {
  maxAge: '1d',
  etag: true
}));

// 5. Versioned API Routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/rider', riderRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// Prepared API Version 2 route stub
app.use('/api/v2/', (req, res) => {
  res.status(501).json({ success: false, message: 'API version 2 is not yet implemented.' });
});

// File upload endpoint for the Supabase mock client
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
  }

  try {
    const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const destination = path.join(uploadsBaseDir, filename);
    fs.writeFileSync(destination, req.file.buffer);

    console.log(`[Upload API] Saved file to local storage: ${destination}`);
    return res.json({ path: filename });
  } catch (err) {
    console.error('[Upload API] Error saving file:', err.message);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 6. Transparent proxy mapping endpoint for backward compatibility with supabase.from() client queries
app.post('/api/query', AdminController.executeQuery);

// 7. System Health Endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = isMockActive() ? 'degraded (mock pool)' : 'healthy (MySQL 8 connected)';
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: true,
    message: 'System is healthy.',
    data: {
      database: dbStatus,
      sockets: {
        status: 'healthy',
        activeDriversOnline: getOnlineDriverCount()
      },
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
        },
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${Math.round(process.uptime())}s`
      },
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// 8. Swagger Autogen Setup Placeholder
app.get('/api-docs', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>ZipRide Swagger Documentation</title>
        <style>body { font-family: sans-serif; padding: 40px; background: #1a1a1a; color: #fff; }</style>
      </head>
      <body>
        <h1>ZipRide Backend APIs (Interactive documentation)</h1>
        <p>Interactive endpoints swagger documentation maps standard CRUD payloads.</p>
        <ul>
          <li><b>POST /api/v1/auth/register</b>: Register rider</li>
          <li><b>POST /api/v1/auth/login</b>: User credentials login</li>
          <li><b>POST /api/v1/rides/request</b>: Request dynamic ride</li>
          <li><b>POST /api/query</b>: Dynamic client query proxy</li>
        </ul>
      </body>
    </html>
  `);
});

// Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'ZipRide Production Enterprise Server is active.' });
});

// Global Error Handler
app.use(errorHandler);

// 9. Initialize Socket.io and background Crons
initializeSocket(server);
CronService.initializeSchedulers();

// 10. Initialize MongoDB connection — used for audit logs, tracking history, notifications.
// connectMongoDB() prints ✅ / ❌ internally; no duplicate log needed here.
try {
  await connectMongoDB();
  await ensureMongoIndexes();
} catch (err) {
  console.error(`❌ MongoDB Connection Failed: ${err.message}`);
  console.error('[MongoDB] App continues with MySQL only — MongoDB-backed features (audit logs, tracking history, notifications) will be unavailable.');
}

// Run database column migrations
runDatabaseMigrations().catch(() => {});

// Reload watcher trigger
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('✅ Server Started');
});
