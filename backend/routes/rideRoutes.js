import express from 'express';
import { RideController } from '../controllers/rideController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireVerifiedDriver } from '../middleware/driver.js';

const router = express.Router();

const checkDriverVerifiedIfDriver = (req, res, next) => {
  if (req.user?.role === 'driver') {
    return requireVerifiedDriver(req, res, next);
  }
  next();
};

router.post('/request', requireAuth, RideController.requestRide);
router.get('/active', requireAuth, RideController.getActiveRide);
router.get('/history', requireAuth, RideController.getRiderHistory);
router.get('/:id', requireAuth, RideController.getRide);
router.post('/:id/accept', requireAuth, requireVerifiedDriver, RideController.acceptRide);
router.post('/:id/start', requireAuth, requireVerifiedDriver, RideController.startRide);
router.post('/:id/complete', requireAuth, requireVerifiedDriver, RideController.completeRide);
router.post('/:id/cancel', requireAuth, checkDriverVerifiedIfDriver, RideController.cancelRide);

export default router;

