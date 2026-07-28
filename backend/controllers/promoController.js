// backend/controllers/promoController.js
// Promo code management — Admin CRUD + Rider apply

import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { AuditService } from '../services/auditService.js';

export const PromoController = {

  // GET /api/v1/promo — List all promo codes (Admin)
  async listPromos(req, res, next) {
    try {
      const { limit, offset, search, status } = parsePagination(req.query);
      let sql = `SELECT * FROM promo_codes WHERE 1=1`;
      const params = [];
      if (search) { sql += ` AND (promo_code LIKE ? OR description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
      if (status === 'active')   { sql += ` AND is_active = 1`; }
      if (status === 'inactive') { sql += ` AND is_active = 0`; }
      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const [rows] = await db.execute(sql, params);
      return sendSuccess(res, 'Promo codes retrieved.', rows);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/promo — Create promo code (Admin)
  async createPromo(req, res, next) {
    try {
      const {
        promoCode, description, discountType, discountValue,
        minimumAmount = 0, maximumDiscount = null,
        usageLimit = null, expiryDate = null
      } = req.body;

      if (!promoCode || !discountType || !discountValue) {
        return sendError(res, 'promoCode, discountType, and discountValue are required.', 400);
      }

      const [existing] = await db.execute(`SELECT id FROM promo_codes WHERE promo_code = ? LIMIT 1`, [promoCode]);
      if (existing[0]) return sendError(res, 'Promo code already exists.', 409);

      const [result] = await db.execute(
        `INSERT INTO promo_codes (promo_code, description, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, used_count, expiry_date, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, NOW())`,
        [promoCode.toUpperCase(), description || '', discountType, discountValue, minimumAmount, maximumDiscount, usageLimit, expiryDate || null]
      );

      await AuditService.logAction({ profileId: req.user.id, action: 'PROMO_CREATED', tableName: 'promo_codes', recordId: String(result.insertId), ipAddress: req.ip }).catch(() => {});
      const [[created]] = await db.execute(`SELECT * FROM promo_codes WHERE id = ?`, [result.insertId]);
      return res.status(201).json({ success: true, message: 'Promo code created.', data: created });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/promo/:id — Update promo code (Admin)
  async updatePromo(req, res, next) {
    try {
      const id = req.params.id;
      const { description, discountType, discountValue, minimumAmount, maximumDiscount, usageLimit, expiryDate, isActive } = req.body;

      const fields = [];
      const values = [];
      if (description   !== undefined) { fields.push('description = ?');    values.push(description); }
      if (discountType  !== undefined) { fields.push('discount_type = ?');  values.push(discountType); }
      if (discountValue !== undefined) { fields.push('discount_value = ?'); values.push(discountValue); }
      if (minimumAmount !== undefined) { fields.push('minimum_amount = ?'); values.push(minimumAmount); }
      if (maximumDiscount !== undefined) { fields.push('maximum_discount = ?'); values.push(maximumDiscount); }
      if (usageLimit    !== undefined) { fields.push('usage_limit = ?');    values.push(usageLimit); }
      if (expiryDate    !== undefined) { fields.push('expiry_date = ?');    values.push(expiryDate); }
      if (isActive      !== undefined) { fields.push('is_active = ?');      values.push(isActive ? 1 : 0); }

      if (!fields.length) return sendError(res, 'No fields to update.', 400);
      values.push(id);
      await db.execute(`UPDATE promo_codes SET ${fields.join(', ')} WHERE id = ?`, values);
      await AuditService.logAction({ profileId: req.user.id, action: 'PROMO_UPDATED', tableName: 'promo_codes', recordId: String(id), ipAddress: req.ip }).catch(() => {});
      return sendSuccess(res, 'Promo code updated.');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/promo/:id — Delete promo code (Admin)
  async deletePromo(req, res, next) {
    try {
      await db.execute(`DELETE FROM promo_codes WHERE id = ?`, [req.params.id]);
      await AuditService.logAction({ profileId: req.user.id, action: 'PROMO_DELETED', tableName: 'promo_codes', recordId: String(req.params.id), ipAddress: req.ip }).catch(() => {});
      return sendSuccess(res, 'Promo code deleted.');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/promo/apply — Apply promo code to a fare (Rider)
  async applyPromo(req, res, next) {
    try {
      const { promoCode, fareAmount } = req.body;
      if (!promoCode || !fareAmount) return sendError(res, 'promoCode and fareAmount are required.', 400);

      const [rows] = await db.execute(
        `SELECT * FROM promo_codes WHERE promo_code = ? AND is_active = 1
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
         AND (usage_limit IS NULL OR used_count < usage_limit)
         LIMIT 1`,
        [promoCode.toUpperCase()]
      );
      const promo = rows[0];
      if (!promo) return sendError(res, 'Invalid, expired, or usage-limit-reached promo code.', 404);

      if (fareAmount < (promo.minimum_amount || 0)) {
        return sendError(res, `Minimum fare of ₹${promo.minimum_amount} required for this promo.`, 400);
      }

      let discountAmount = 0;
      if (promo.discount_type === 'Percentage') {
        discountAmount = (fareAmount * promo.discount_value) / 100;
        if (promo.maximum_discount) discountAmount = Math.min(discountAmount, promo.maximum_discount);
      } else {
        discountAmount = Math.min(promo.discount_value, fareAmount);
      }

      const finalFare = Math.max(0, fareAmount - discountAmount);
      return sendSuccess(res, 'Promo applied successfully.', {
        promoCode: promo.promo_code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        discountAmount: +discountAmount.toFixed(2),
        originalFare: fareAmount,
        finalFare:    +finalFare.toFixed(2),
      });
    } catch (err) {
      next(err);
    }
  },
};

export default PromoController;
