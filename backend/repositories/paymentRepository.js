// backend/repositories/paymentRepository.js
// All SQL for payments — uses actual schema: payments table

import db from '../config/db.js';

const mapPaymentMethod = (pm) => {
  if (!pm) return 'Card';
  const str = String(pm).trim().toLowerCase();
  if (str.includes('cash')) return 'Cash';
  if (str.includes('wallet')) return 'Wallet';
  if (str.includes('upi')) return 'UPI';
  return 'Card';
};

export const PaymentRepository = {
  async createPayment(data) {
    const {
      ride_id,
      amount,
      status = 'Pending',
      payment_method = 'Card',
      gateway = 'Razorpay',
      gateway_order_id = null,
      transaction_id = null,
      response_json = null,
    } = data;

    const validMethod = mapPaymentMethod(payment_method);

    // Check if a payment entry already exists for this order/ride
    if (gateway_order_id) {
      const existing = await this.findByOrderId(gateway_order_id);
      if (existing) return existing.id;
    }

    const [result] = await db.execute(
      `INSERT INTO payments (ride_id, amount, status, payment_method, gateway, gateway_order_id, transaction_id, response_json, created_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [ride_id, amount, status, validMethod, gateway, gateway_order_id, transaction_id, response_json ? JSON.stringify(response_json) : null]
    );

    return result.insertId;
  },

  async updatePaymentSuccess(idOrOrderId, { transaction_id, gateway_order_id = null, response_json = null }) {
    let sql = `UPDATE payments
               SET status = 'Success',
                   transaction_id = COALESCE(?, transaction_id),
                   gateway_order_id = COALESCE(?, gateway_order_id),
                   response_json = COALESCE(?, response_json),
                   completed_time = NOW(),
                   updated_at = NOW() `;
    const jsonStr = response_json ? JSON.stringify(response_json) : null;
    const isNum = !isNaN(idOrOrderId) && Number.isInteger(Number(idOrOrderId));
    if (isNum) {
      sql += `WHERE id = ? OR gateway_order_id = ?`;
      await db.execute(sql, [transaction_id, gateway_order_id, jsonStr, idOrOrderId, String(idOrOrderId)]);
    } else {
      sql += `WHERE gateway_order_id = ?`;
      await db.execute(sql, [transaction_id, gateway_order_id, jsonStr, String(idOrOrderId)]);
    }
  },

  async updatePaymentFailed(idOrOrderId, { response_json = null } = {}) {
    let sql = `UPDATE payments
               SET status = 'Failed',
                   response_json = COALESCE(?, response_json),
                   updated_at = NOW() `;
    const jsonStr = response_json ? JSON.stringify(response_json) : null;
    const isNum = !isNaN(idOrOrderId) && Number.isInteger(Number(idOrOrderId));
    if (isNum) {
      sql += `WHERE id = ? OR gateway_order_id = ?`;
      await db.execute(sql, [jsonStr, idOrOrderId, String(idOrOrderId)]);
    } else {
      sql += `WHERE gateway_order_id = ?`;
      await db.execute(sql, [jsonStr, String(idOrOrderId)]);
    }
  },

  async findByOrderId(gatewayOrderId) {
    if (!gatewayOrderId) return null;
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE gateway_order_id = ? LIMIT 1`,
      [gatewayOrderId]
    );
    return rows[0] || null;
  },

  async findByRideId(rideId) {
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE ride_id = ? ORDER BY id DESC LIMIT 1`,
      [rideId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByTransactionId(transactionId) {
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE transaction_id = ? LIMIT 1`,
      [transactionId]
    );
    return rows[0] || null;
  },
};

export default PaymentRepository;
