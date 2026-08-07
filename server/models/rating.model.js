import { dbGet, dbRun, dbAll } from '../config/database.js';

export const RatingModel = {
  async findById(id) {
    return dbGet('SELECT * FROM ratings WHERE id = ?', [id]);
  },

  async findByRideId(rideId) {
    return dbAll('SELECT * FROM ratings WHERE ride_id = ?', [rideId]);
  },

  async getAverageForDriver(driverId) {
    const row = await dbGet(
      'SELECT AVG(rating) as avg_rating FROM ratings WHERE ratee_id = ?',
      [driverId]
    );
    return row && row.avg_rating ? parseFloat(row.avg_rating.toFixed(2)) : 5.00;
  },

  async create(ratingData) {
    const { id, ride_id, rater_id, ratee_id, rating, comment } = ratingData;
    
    // 1. Insert review
    await dbRun(
      `INSERT INTO ratings (id, ride_id, rater_id, ratee_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ride_id, rater_id, ratee_id, rating, comment]
    );

    // 2. Recalculate average rating for the ratee driver
    const newAverage = await this.getAverageForDriver(ratee_id);
    await dbRun('UPDATE drivers SET rating = ? WHERE id = ?', [newAverage, ratee_id]);

    return this.findById(id);
  }
};
