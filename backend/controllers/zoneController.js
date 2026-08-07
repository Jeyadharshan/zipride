// backend/controllers/zoneController.js
// Service Zone management — Admin CRUD for polygon service areas

import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuditService } from '../services/auditService.js';

/**
 * Check if a point (lat, lng) is inside a polygon.
 * Polygon is an array of [lat, lng] pairs using ray-casting algorithm.
 */
export const isPointInPolygon = (lat, lng, polygon) => {
  let inside = false;
  const n = polygon.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
};

export const ZoneController = {

  // GET /api/v1/zones — List service zones (Admin/Public)
  async listZones(req, res, next) {
    try {
      const status = req.query.status || null;
      let sql = `SELECT sz.*, c.city_name FROM service_zones sz LEFT JOIN cities c ON sz.city_id = c.id WHERE 1=1`;
      const params = [];
      if (status) { sql += ` AND sz.status = ?`; params.push(status); }
      sql += ` ORDER BY sz.zone_name ASC`;
      const [rows] = await db.execute(sql, params);

      // Parse zone_polygon JSON for each row
      const zones = rows.map(z => ({
        ...z,
        zone_polygon: z.zone_polygon ? JSON.parse(z.zone_polygon) : null,
      }));
      return sendSuccess(res, 'Service zones retrieved.', zones);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/zones/:id — Get single zone
  async getZone(req, res, next) {
    try {
      const [[zone]] = await db.execute(`SELECT * FROM service_zones WHERE id = ?`, [req.params.id]);
      if (!zone) return sendError(res, 'Zone not found.', 404);
      zone.zone_polygon = zone.zone_polygon ? JSON.parse(zone.zone_polygon) : null;
      return sendSuccess(res, 'Zone retrieved.', zone);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/zones — Create zone (Admin)
  async createZone(req, res, next) {
    try {
      const { zoneName, cityId, zonePolygon } = req.body;
      if (!zoneName || !zonePolygon) return sendError(res, 'zoneName and zonePolygon are required.', 400);

      const polygonJson = typeof zonePolygon === 'string' ? zonePolygon : JSON.stringify(zonePolygon);
      const [result] = await db.execute(
        `INSERT INTO service_zones (city_id, zone_name, zone_polygon, status) VALUES (?, ?, ?, 'Active')`,
        [cityId || null, zoneName, polygonJson]
      );
      await AuditService.logAction({ profileId: req.user.id, action: 'ZONE_CREATED', tableName: 'service_zones', recordId: String(result.insertId), ipAddress: req.ip }).catch(() => {});
      const [[created]] = await db.execute(`SELECT * FROM service_zones WHERE id = ?`, [result.insertId]);
      created.zone_polygon = JSON.parse(created.zone_polygon);
      return res.status(201).json({ success: true, message: 'Service zone created.', data: created });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/zones/:id — Update zone (Admin)
  async updateZone(req, res, next) {
    try {
      const { zoneName, cityId, zonePolygon, status } = req.body;
      const fields = [];
      const values = [];
      if (zoneName    !== undefined) { fields.push('zone_name = ?');    values.push(zoneName); }
      if (cityId      !== undefined) { fields.push('city_id = ?');      values.push(cityId); }
      if (zonePolygon !== undefined) { fields.push('zone_polygon = ?'); values.push(typeof zonePolygon === 'string' ? zonePolygon : JSON.stringify(zonePolygon)); }
      if (status      !== undefined) { fields.push('status = ?');       values.push(status); }
      if (!fields.length) return sendError(res, 'No fields to update.', 400);
      values.push(req.params.id);
      await db.execute(`UPDATE service_zones SET ${fields.join(', ')} WHERE id = ?`, values);
      await AuditService.logAction({ profileId: req.user.id, action: 'ZONE_UPDATED', tableName: 'service_zones', recordId: String(req.params.id), ipAddress: req.ip }).catch(() => {});
      return sendSuccess(res, 'Service zone updated.');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/zones/:id — Delete zone (Admin)
  async deleteZone(req, res, next) {
    try {
      await db.execute(`DELETE FROM service_zones WHERE id = ?`, [req.params.id]);
      await AuditService.logAction({ profileId: req.user.id, action: 'ZONE_DELETED', tableName: 'service_zones', recordId: String(req.params.id), ipAddress: req.ip }).catch(() => {});
      return sendSuccess(res, 'Service zone deleted.');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/zones/check — Check if coordinates are in any active service zone
  async checkLocation(req, res, next) {
    try {
      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) return sendError(res, 'latitude and longitude required.', 400);

      const [zones] = await db.execute(`SELECT * FROM service_zones WHERE status = 'Active'`);
      let matchedZone = null;
      for (const zone of zones) {
        const polygon = zone.zone_polygon ? JSON.parse(zone.zone_polygon) : [];
        if (polygon.length > 0 && isPointInPolygon(parseFloat(latitude), parseFloat(longitude), polygon)) {
          matchedZone = { id: zone.id, zoneName: zone.zone_name };
          break;
        }
      }

      return sendSuccess(res, matchedZone ? 'Location is within a service zone.' : 'Location is outside all service zones.', {
        inServiceZone: !!matchedZone,
        zone: matchedZone,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default ZoneController;
