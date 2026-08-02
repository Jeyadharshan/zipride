import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import { connectMongoDB } from './config/mongodb.js';
import { errorHandler } from './middleware/error.js';
import { uploadSingle } from './middleware/upload.js';
import { requireAuth } from './middleware/auth.js';
import { QueryController } from './controllers/query.controller.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import riderRoutes from './routes/rider.routes.js';
import driverRoutes from './routes/driver.routes.js';
import rideRoutes from './routes/ride.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON/url-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload folder
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// File Upload endpoint
app.post('/api/upload', requireAuth, uploadSingle('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded.' } });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({
      path: req.file.filename,
      publicUrl: publicUrl
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// Generic SQL query runner endpoint
app.post('/api/query', QueryController.executeQuery);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);

// Base status route
app.get('/api/status', (req, res) => {
  res.json({ status: 'ZipRide custom SQL backend is running online.' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize DB and listen
const startServer = async () => {
  try {
    await initDatabase();
    await connectMongoDB();
    console.log('[Startup] Connected to MySQL and MongoDB.');
  } catch (err) {
    console.warn('[Startup WARNING] DB connection failed during startup:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`[Express] Server is running on port ${PORT}`);
  });
};

startServer();

