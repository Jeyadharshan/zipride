// backend/controllers/sosController.js
// SOS Emergency System — instant admin alert via socket + DB persistence

import db from '../config/db.js';
import { getIo } from '../socket/socket.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { AuditService } from '../services/auditService.js';

export const SosController = {

  // POST /api/v1/sos — Rider/Driver triggers SOS
  async triggerSos(req, res, next) {
    try {
      const { rideId, latitude, longitude, emergencyMessage } = req.body;
      const profileId = req.user.id;
      const role = req.user.role;

      if (!latitude || !longitude) {
        return sendError(res, 'Location (latitude, longitude) is required for SOS.', 400);
      }

      // Resolve driver_id int if it's a driver
      let driverIntId = null;
      if (role === 'driver') {
        const [dpRows] = await db.execute(`SELECT id FROM driver_profiles WHERE profile_id = ? LIMIT 1`, [profileId]);
        driverIntId = dpRows[0]?.id || null;
      }

      // Resolve ride_id int
      let rideIntId = null;
      if (rideId) {
        const [[rideRow]] = await db.execute(`SELECT id FROM rides WHERE id = ? OR ride_code = ? LIMIT 1`, [rideId, rideId]);
        rideIntId = rideRow?.id || null;
      }

      const [result] = await db.execute(
        `INSERT INTO sos_requests (ride_id, rider_id, driver_id, latitude, longitude, emergency_message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
        [rideIntId, role === 'rider' ? profileId : null, driverIntId, latitude, longitude, emergencyMessage || 'Emergency! Assistance needed.']
      );
      const sosId = result.insertId;

      // Get requester info for admin broadcast
      const [[profile]] = await db.execute(`SELECT full_name, phone FROM profiles WHERE id = ? LIMIT 1`, [profileId]);

      // Broadcast to all admin sockets immediately
      const io = getIo();
      if (io) {
        io.emit('admin:sos_alert', {
          sosId,
          rideId:           rideIntId,
          triggeredBy:      role,
          name:             profile?.full_name || 'Unknown',
          phone:            profile?.phone     || 'N/A',
          latitude,
          longitude,
          emergencyMessage: emergencyMessage || 'Emergency! Assistance needed.',
          timestamp:        new Date().toISOString(),
        });
      }

      // Audit log
      await AuditService.logAction({
        profileId,
        action: 'SOS_TRIGGERED',
        tableName: 'sos_requests',
        recordId: String(sosId),
        ipAddress: req.ip,
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'SOS alert triggered. Help is on the way.',
        data: { sosId, status: 'Pending' }
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/sos — List SOS requests (Admin)
  async listSosRequests(req, res, next) {
    try {
      const { limit, offset, status } = parsePagination(req.query);
      let sql = `
        SELECT sr.*, p.full_name AS rider_name, p.phone AS rider_phone
        FROM sos_requests sr
        LEFT JOIN profiles p ON sr.rider_id = p.id
        WHERE 1=1
      `;
      const params = [];
      if (status) { sql += ` AND sr.status = ?`; params.push(status); }
      sql += ` ORDER BY sr.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const [rows] = await db.execute(sql, params);
      return sendSuccess(res, 'SOS requests retrieved.', rows);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/sos/:id/resolve — Mark SOS as resolved (Admin)
  async resolveSos(req, res, next) {
    try {
      await db.execute(`UPDATE sos_requests SET status = 'Resolved' WHERE id = ?`, [req.params.id]);
      await AuditService.logAction({ profileId: req.user.id, action: 'SOS_RESOLVED', tableName: 'sos_requests', recordId: String(req.params.id), ipAddress: req.ip }).catch(() => {});
      return sendSuccess(res, 'SOS request resolved.');
    } catch (err) {
      next(err);
    }
  },
};

export default SosController;
