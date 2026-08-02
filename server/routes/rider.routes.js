import express from 'express';
import { RiderController } from '../controllers/rider.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', RiderController.getProfile);
router.put('/profile', RiderController.updateProfile);

export default router;
