import crypto from 'crypto';
import { RatingModel } from '../models/rating.model.js';

export const RatingController = {
  async submitRating(req, res, next) {
    try {
      const { rideId, rateeId, rating, comment } = req.body;
      if (!rideId || !rateeId || !rating) {
        return res.status(400).json({ error: { message: 'rideId, rateeId, and rating are required.' } });
      }

      const review = await RatingModel.create({
        id: crypto.randomUUID(),
        ride_id: rideId,
        rater_id: req.user.id,
        ratee_id: rateeId,
        rating: parseInt(rating),
        comment: comment || ''
      });

      res.status(201).json({ data: review });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
