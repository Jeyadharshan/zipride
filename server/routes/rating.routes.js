import express from 'express';
import { RatingController } from '../controllers/rating.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', RatingController.submitRating);

export default router;
