import express from 'express';
import { RideController } from '../controllers/ride.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', RideController.requestRide);
router.get('/active', RideController.getActiveRide);
router.get('/history', RideController.getRideHistory);
router.get('/:id', RideController.getRideDetails);
router.put('/:id/cancel', RideController.cancelRide);
router.put('/:id/accept', RideController.acceptRide);
router.put('/:id/start', RideController.startRide);
router.put('/:id/complete', RideController.completeRide);

export default router;
