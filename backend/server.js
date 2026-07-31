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
import tipRoutes from './routes/tipRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import promoRoutes from './routes/promoRoutes.js';
import sosRoutes from './routes/sosRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';

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
// Allowed origins: environment variable, Vercel app domains, local dev, and wildcard match for preview deployments
const ALLOWED_ORIGINS = [
  ...(process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  'https://zipride-khaki.vercel.app',  // primary Vercel production URL
  'http://localhost:5173',             // local dev (Vite)
  'http://localhost:3000',             // local dev (CRA / fallback)
];

// Global CORS Header & OPTIONS Preflight Middleware (ensures CORS headers are ALWAYS returned)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Role, Accept');
  res.setHeader('Access-Control-Exposed-Headers', 'X-JWT-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const allowed =
      ALLOWED_ORIGINS.includes(cleanOrigin) ||
      /\.vercel\.app$/.test(cleanOrigin) ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1');

    if (allowed) {
      callback(null, origin);
    } else {
      // Return origin instead of throwing Error to prevent 500 without CORS headers
      callback(null, origin);
    }
  },
  exposedHeaders: ['X-JWT-Token'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'X-User-Role', 'Accept'],
  optionsSuccessStatus: 200,
}));

// Explicitly handle all OPTIONS preflight requests
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
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsBaseDir, filename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  try {
    const { GridFSService } = await import('./services/gridfsService.js');
    let gridFile = null;
    if (filename.length === 24 && /^[0-9a-fA-F]{24}$/.test(filename)) {
      gridFile = await GridFSService.getFileStream(filename);
    }
    if (!gridFile) {
      gridFile = await GridFSService.getFileStreamByFilename(filename);
    }

    if (gridFile) {
      res.setHeader('Content-Type', gridFile.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return gridFile.downloadStream.pipe(res);
    }
  } catch (e) {}

  // If the file does not exist on disk or GridFS, return a clean SVG badge showing "Image not available"
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" fill="none"><rect width="300" height="200" fill="#f8fafc"/><rect x="1" y="1" width="298" height="198" rx="8" stroke="#cbd5e1" stroke-dasharray="4 4"/><text x="150" y="105" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="600" fill="#64748b">Image not available</text></svg>`);
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
app.use('/api/rides', rideRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/v1/tips', tipRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
// Admin routes handles /api/v1/admin/driver/:driverId/location
app.use('/api/v1/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/promos', promoRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/v1/sos', sosRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/v1/zones', zoneRoutes);
app.use('/api/zones', zoneRoutes);

// Prepared API Version 2 route stub
app.use('/api/v2/', (req, res) => {
  res.status(501).json({ success: false, message: 'API version 2 is not yet implemented.' });
});

// File upload endpoint for the Supabase mock client (uploads directly to Cloudinary)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
  }

  try {
    const { CloudinaryService } = await import('./services/cloudinaryService.js');
    const folder = req.body?.folder || 'zipride_uploads';
    const uploadResult = await CloudinaryService.uploadImage(req.file.buffer, folder);

    if (uploadResult) {
      return res.json({
        path: uploadResult.url,
        url: uploadResult.url,
        filename: uploadResult.publicId,
        public_id: uploadResult.publicId
      });
    }

    // Fallback if Cloudinary is missing configuration
    const base64Data = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;
    return res.json({ path: dataUri, url: dataUri, filename: 'datauri' });
  } catch (err) {
    console.error('[Upload API] Error saving file to Cloudinary:', err.message);
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

// Root route + fast wake-up health check (no auth required — used by frontend to wake Render)
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: Math.round(process.uptime()) });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'ZipRide Production Enterprise Server is active.' });
});

// Catch-all JSON 404 handler (prevents Express from returning HTML for unmatched routes)
app.use((req, res, next) => {
  // Only intercept API routes — let non-API paths fall through
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      error: 'route_not_found'
    });
  }
  next();
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
