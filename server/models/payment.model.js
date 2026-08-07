import { dbGet, dbRun, dbAll } from '../config/database.js';

export const PaymentModel = {
  async findById(id) {
    return dbGet('SELECT * FROM payments WHERE id = ?', [id]);
  },

  async findByRideId(rideId) {
    return dbGet('SELECT * FROM payments WHERE ride_id = ?', [rideId]);
  },

  async create(paymentData) {
    const { id, ride_id, amount, status = 'pending', payment_method, transaction_reference } = paymentData;
    await dbRun(
      `INSERT INTO payments (id, ride_id, amount, status, payment_method, transaction_reference)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ride_id, amount, status, payment_method, transaction_reference]
    );
    return this.findById(id);
  },

  async updateStatus(id, status, transactionReference = null) {
    if (transactionReference) {
      await dbRun(
        "UPDATE payments SET status = ?, transaction_reference = ?, updated_at = datetime('now') WHERE id = ?",
        [status, transactionReference, id]
      );
    } else {
      await dbRun("UPDATE payments SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
    }
    return this.findById(id);
  }
};
