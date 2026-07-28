import express from 'express';
import { DriverController } from '../controllers/driver.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDriver } from '../middleware/driver.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', DriverController.getProfile);
router.get('/profile/:id', DriverController.getProfile);

// Protect status updates and location streams to drivers only
router.put('/profile', requireDriver, DriverController.updateProfile);
router.post('/online', requireDriver, DriverController.goOnline);
router.post('/offline', requireDriver, DriverController.goOffline);
router.post('/location', requireDriver, DriverController.updateLocation);

export default router;
