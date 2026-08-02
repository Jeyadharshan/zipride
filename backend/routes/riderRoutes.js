import express from 'express';
import { RiderController } from '../controllers/riderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', requireAuth, RiderController.getProfile);
router.put('/profile', requireAuth, RiderController.updateProfile);
router.get('/favourites', requireAuth, RiderController.getFavourites);
router.post('/favourites', requireAuth, RiderController.addFavourite);
router.get('/recent-places', requireAuth, RiderController.getRecentPlaces);

export default router;
