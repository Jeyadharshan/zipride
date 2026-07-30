// backend/controllers/adminController.js
// Admin operations using the actual schema (profiles, driver_profiles, etc.)

import { AdminRepository } from '../repositories/adminRepository.js';
import { QueryRepository } from '../repositories/queryRepository.js';
import { getOnlineDriverCount } from '../socket/socket.js';
import { generateAccessToken } from '../config/jwt.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { AuditService } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';
import { formatAssetUrl } from '../utils/formatUrl.js';
import db from '../config/db.js';

export const AdminController = {
  // Legacy frontend proxy query endpoint (Supabase compatibility layer)
  async executeQuery(req, res, next) {
    try {
      const payload = req.body || {};
      const result = await QueryRepository.executeDynamicQuery(payload);

      // If the query is on the profiles table with a password filter, inject a JWT
      const passFilter = payload.filters?.find(f => f?.column === 'password_hash' && f?.operator === 'eq');
      if (payload.table === 'profiles' && passFilter && result?.data) {
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        if (row && row.id) {
          const token = generateAccessToken({
            id: row.id,
            user_id: row.id,
            role: row.role,
            phone: row.phone,
            full_name: row.full_name
          });
          res.setHeader('X-JWT-Token', token);
          res.setHeader('Access-Control-Expose-Headers', 'X-JWT-Token');
        }
      }

      return res.json({
        data: result?.data ?? null,
        count: result?.count ?? null,
        error: result?.error ?? null,
      });
    } catch (err) {
      console.error('[Admin Query Proxy] FAILED request payload:', JSON.stringify(req.body, null, 2));
      console.error('[Admin Query Proxy] error:', err.message);
      try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const dirname = path.dirname(fileURLToPath(import.meta.url));
        const logPath = path.resolve(dirname, '../logs/error.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] [QUERY_ERROR] payload: ${JSON.stringify(req.body)} error: ${err.message}\n${err.stack}\n`);
      } catch (logErr) {}
      return res.json({
        data: null,
        count: null,
        error: { message: err.message || 'Dynamic query execution failed.' }
      });
    }
  },

  async getDashboardStats(req, res, next) {
    try {
      const stats = await AdminRepository.getDashboardStats();
      return sendSuccess(res, 'Dashboard stats retrieved.', {
        ...stats,
        onlineDrivers: getOnlineDriverCount(),
      });
    } catch (err) {
      next(err);
    }
  },

  async getAnalytics(req, res, next) {
    try {
      const stats = await AdminRepository.getDashboardStats();
      return sendSuccess(res, 'Analytics retrieved.', stats);
    } catch (err) {
      next(err);
    }
  },

  async getUsers(req, res, next) {
    try {
      const { page, limit, offset, search, status, order } = parsePagination(req.query);
      const role = req.query.role || null;
      const [rows, total] = await Promise.all([
        AdminRepository.listAllProfiles({ limit, offset, search, role, status }),
        AdminRepository.countProfiles(search, role, status),
      ]);
      return sendPaginated(res, 'Accounts retrieved.', rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },

  async getPendingDrivers(req, res, next) {
    try {
      const { page, limit, offset } = parsePagination(req.query);
      const rows = await AdminRepository.listPendingDrivers({ limit, offset });
      return sendSuccess(res, 'Pending drivers retrieved.', rows);
    } catch (err) {
      next(err);
    }
  },

  // Full drivers list with profile name, vehicle, stats, MongoDB docs
  async getDriversList(req, res, next) {
    try {
      const search = req.query.search || '';
      let sql = `
        SELECT
          p.id AS profile_id, p.full_name, p.email, p.phone, p.account_status, p.profile_image AS profile_avatar,
          dp.id AS driver_id, dp.driver_code, dp.license_number, dp.verification_status,
          dp.is_online, dp.is_banned, dp.rating, dp.online_seconds, dp.created_at,
          dp.profile_photo AS direct_profile_photo, dp.driving_licence_image AS direct_license_photo,
          COUNT(DISTINCT r.id) AS total_rides,
          SUM(CASE WHEN r.ride_status IN ('Ride Completed', 'completed') THEN 1 ELSE 0 END) AS completed_rides,
          COALESCE(SUM(CASE WHEN r.ride_status IN ('Ride Completed', 'completed') THEN COALESCE(r.final_fare, r.estimated_fare, 0) ELSE 0 END), 0) AS total_earnings,
          dd.profile_photo AS mysql_profile_photo,
          v.vehicle_brand AS vehicle_make, v.vehicle_model, v.vehicle_color,
          v.vehicle_number AS license_plate, v.vehicle_type_id
        FROM driver_profiles dp
        JOIN profiles p ON dp.profile_id = p.id
        LEFT JOIN driver_documents dd ON dd.driver_id = dp.id
        LEFT JOIN vehicles v ON v.driver_id = dp.id AND v.is_active = 1
        LEFT JOIN rides r ON r.driver_id = dp.id
        WHERE 1=1
      `;
      const params = [];
      if (search) {
        sql += ` AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ? OR dp.license_number LIKE ? OR v.vehicle_number LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
      }
      sql += ` GROUP BY dp.id, p.id, dd.id, v.id ORDER BY dp.created_at DESC`;

      const [rows] = await db.query(sql, params);

      const { MongoService } = await import('../services/mongoService.js');
      const enriched = await Promise.all(rows.map(async (row) => {
        let mongoDocs = null;
        try {
          mongoDocs = await MongoService.getDriverDocuments(row.profile_id);
        } catch (e) {}
        const rawProfilePhoto = row.direct_profile_photo || row.profile_avatar || mongoDocs?.profile_photo_url || mongoDocs?.profile_photo || mongoDocs?.profilePhoto || row.mysql_profile_photo || null;
        const rawLicensePhoto = row.direct_license_photo || mongoDocs?.license_image_url || mongoDocs?.license_photo || mongoDocs?.drivingLicense || null;
        
        const profilePhoto = formatAssetUrl(rawProfilePhoto, row.full_name);
        const licensePhoto = formatAssetUrl(rawLicensePhoto);

        return {
          ...row,
          profile_photo: profilePhoto,
          profile_photo_url: profilePhoto,
          license_image_url: licensePhoto,
        };
      }));

      return sendSuccess(res, 'Drivers list retrieved.', enriched);
    } catch (err) {
      next(err);
    }
  },

  // Get all driver verifications with merged document URLs
  async getDriverVerifications(req, res, next) {
    try {
      const [rows] = await db.query(
        `SELECT p.id AS profile_id, p.full_name, p.email, p.phone, p.profile_image AS profile_avatar,
                dp.id AS driver_id, dp.driver_code,
                COALESCE(dp.driving_licence_number, dp.license_number) AS license_number,
                dp.verification_status, dp.verification_date, dp.verified_by, dp.rejection_reason,
                dp.profile_photo AS direct_profile_photo, dp.driving_licence_image AS direct_license_photo,
                dp.created_at,
                dd.profile_photo AS mysql_profile_photo, dd.license_photo AS mysql_license_photo,
                v.vehicle_brand AS vehicle_make, v.vehicle_model, v.vehicle_color, v.vehicle_number AS license_plate
         FROM driver_profiles dp
         JOIN profiles p ON dp.profile_id = p.id
         LEFT JOIN driver_documents dd ON dd.driver_id = dp.id
         LEFT JOIN vehicles v ON v.driver_id = dp.id AND v.is_active = 1
         ORDER BY dp.created_at DESC`
      );

      // Load MongoDB documents for each driver
      let enriched = rows;
      try {
        const { MongoService } = await import('../services/mongoService.js');
        enriched = await Promise.all(
          rows.map(async (row) => {
            let mongoDocs = null;
            try {
              mongoDocs = await MongoService.getDriverDocuments(row.profile_id);
            } catch (e) {}
            const rawProfilePhoto = row.direct_profile_photo || row.profile_avatar || row.mysql_profile_photo || mongoDocs?.profile_photo_url || mongoDocs?.profile_photo || mongoDocs?.profilePhoto || null;
            const rawLicensePhoto = row.direct_license_photo || row.mysql_license_photo || mongoDocs?.license_image_url || mongoDocs?.license_photo || mongoDocs?.drivingLicense || null;

            const profilePhoto = formatAssetUrl(rawProfilePhoto, row.full_name);
            const licensePhoto = formatAssetUrl(rawLicensePhoto);

            return {
              ...row,
              profile_photo: profilePhoto,
              profile_photo_url: profilePhoto,
              license_image_url: licensePhoto,
            };
          })
        );
      } catch (e) {
        console.warn('[getDriverVerifications] Mongo enrichment failed, using MySQL documents:', e.message);
      }

      return sendSuccess(res, 'Driver verifications retrieved.', enriched);
    } catch (err) {
      next(err);
    }
  },

  // Get documents for a single driver by profile ID (MongoDB-first)
  async getDriverDocuments(req, res, next) {
    try {
      const profileId = req.params.profileId;
      const { default: DocumentService } = await import('../services/documentService.js');
      const mongoDocs = await DocumentService.getDriverDocumentByProfileId(profileId);

      if (!mongoDocs) {
        return res.status(404).json({
          success: false,
          message: 'Driver documents not found'
        });
      }

      const formattedProfilePhoto = formatAssetUrl(mongoDocs.profilePhoto || mongoDocs.profile_photo_url || mongoDocs.profile_photo);
      const formattedDrivingLicense = formatAssetUrl(mongoDocs.drivingLicense || mongoDocs.license_image_url || mongoDocs.license_photo);

      return sendSuccess(res, 'Driver documents retrieved.', {
        driverId: mongoDocs.driverId,
        profileId: mongoDocs.profileId,
        driverName: mongoDocs.driverName,
        phone: mongoDocs.phone,
        email: mongoDocs.email,
        licenseNumber: mongoDocs.licenseNumber,
        profilePhoto: formattedProfilePhoto,
        profile_photo_url: formattedProfilePhoto,
        drivingLicense: formattedDrivingLicense,
        license_image_url: formattedDrivingLicense,
        verificationStatus: mongoDocs.verificationStatus,
        approvedBy: mongoDocs.approvedBy,
        approvedAt: mongoDocs.approvedAt,
        rejectedReason: mongoDocs.rejectedReason,
        createdAt: mongoDocs.createdAt,
        updatedAt: mongoDocs.updatedAt
      });
    } catch (err) {
      next(err);
    }
  },

  async approveDriver(req, res, next) {
    try {
      const driverIdParam = req.params.id;
      if (!driverIdParam) {
        return res.status(400).json({ success: false, message: 'Driver ID is required.' });
      }

      const { DriverRepository } = await import('../repositories/driverRepository.js');
      
      const [[dp]] = await db.query(
        'SELECT id, profile_id FROM driver_profiles WHERE id = ? OR profile_id = ?',
        [driverIdParam, driverIdParam]
      );

      if (!dp) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found.'
        });
      }

      const driverIntId = dp.id;
      const adminId = (req.user?.id && typeof req.user.id === 'string' && req.user.id.length === 36 && req.user.id !== 'admin') ? req.user.id : null;

      // 1. Primary DB status update with standardized 'verified' value
      await DriverRepository.setVerificationStatus(driverIntId, 'verified', adminId, null);

      // 2. Secondary side-effects (safe error catching)
      if (dp.profile_id) {
        try {
          const { default: DocumentService } = await import('../services/documentService.js');
          await DocumentService.updateVerificationStatus(dp.profile_id, 'approved', adminId || 'admin').catch(() => {});
        } catch (e) {}

        try {
          await NotificationService.sendPushNotification(
            dp.profile_id,
            'Driver Verified',
            'Your driver account has been verified by the administrator. You can now go online and accept rides!'
          ).catch(() => {});
        } catch (e) {}

        try {
          await AuditService.logAction({
            profileId: adminId,
            action: 'DRIVER_VERIFIED',
            tableName: 'driver_profiles',
            recordId: String(driverIntId),
            ipAddress: req.ip,
            notes: 'Driver verified by administrator'
          }).catch(() => {});
        } catch (e) {}
      }

      return sendSuccess(res, 'Driver verified successfully.');
    } catch (err) {
      console.error('[approveDriver] Error:', err.message);
      if (err.message.includes('Invalid verification status') || err.message.includes('required')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  async rejectDriver(req, res, next) {
    try {
      const driverIdParam = req.params.id;
      if (!driverIdParam) {
        return res.status(400).json({ success: false, message: 'Driver ID is required.' });
      }

      const { reason } = req.body;
      const { DriverRepository } = await import('../repositories/driverRepository.js');

      const [[dp]] = await db.query(
        'SELECT id, profile_id FROM driver_profiles WHERE id = ? OR profile_id = ?',
        [driverIdParam, driverIdParam]
      );

      if (!dp) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found.'
        });
      }

      const driverIntId = dp.id;
      const adminId = (req.user?.id && typeof req.user.id === 'string' && req.user.id.length === 36 && req.user.id !== 'admin') ? req.user.id : null;
      const rejectionReasonVal = reason || 'Document verification failed.';

      // 1. Primary DB status update with standardized 'rejected' value
      await DriverRepository.setVerificationStatus(driverIntId, 'rejected', adminId, rejectionReasonVal);

      // 2. Secondary side-effects (safe error catching)
      if (dp.profile_id) {
        try {
          const { default: DocumentService } = await import('../services/documentService.js');
          await DocumentService.updateVerificationStatus(dp.profile_id, 'rejected', adminId || 'admin', rejectionReasonVal).catch(() => {});
        } catch (e) {}

        try {
          await NotificationService.sendPushNotification(
            dp.profile_id,
            'Driver Verification Rejected',
            `Your document verification has been rejected. Please review the reason and upload the required documents again. Reason: ${rejectionReasonVal}`
          ).catch(() => {});
        } catch (e) {}

        try {
          await AuditService.logAction({
            profileId: adminId,
            action: 'DRIVER_REJECTED',
            tableName: 'driver_profiles',
            recordId: String(driverIntId),
            ipAddress: req.ip,
            notes: `Driver rejected by administrator: ${rejectionReasonVal}`
          }).catch(() => {});
        } catch (e) {}
      }

      return sendSuccess(res, 'Driver verification rejected.');
    } catch (err) {
      console.error('[rejectDriver] Error:', err.message);
      if (err.message.includes('Invalid verification status') || err.message.includes('required')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  async deleteDriver(req, res, next) {
    try {
      const driverId = parseInt(req.params.id);
      const { DriverRepository } = await import('../repositories/driverRepository.js');
      const DocumentRepository = await import('../repositories/documentRepository.js');

      // Get driver's profile_id first
      const [[driverProfile]] = await db.query(
        'SELECT profile_id FROM driver_profiles WHERE id = ?',
        [driverId]
      );

      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }

      const profileId = driverProfile.profile_id;

      // Delete from MongoDB driver_documents
      try {
        await DocumentRepository.default.deleteByProfileId(profileId);
        console.log(`[adminController] Deleted MongoDB documents for profile: ${profileId}`);
      } catch (err) {
        console.warn('[adminController] Failed to delete MongoDB documents:', err.message);
      }

      // Delete wallet transactions first (foreign key reference)
      await db.query(
        `DELETE FROM wallet_transactions 
         WHERE wallet_id IN (SELECT id FROM wallets WHERE profile_id = ?)`,
        [profileId]
      );

      // Delete wallets
      await db.query('DELETE FROM wallets WHERE profile_id = ?', [profileId]);

      // Delete vehicles
      await db.query('DELETE FROM vehicles WHERE driver_id = ?', [driverId]);

      // Delete driver_profiles
      await db.query('DELETE FROM driver_profiles WHERE id = ?', [driverId]);

      // Create waste table if not exists and back up profile details before purging
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS \`waste\` (
            \`id\` CHAR(36) NOT NULL,
            \`firebase_uid\` VARCHAR(128) DEFAULT NULL,
            \`username\` VARCHAR(50) DEFAULT NULL,
            \`password_hash\` VARCHAR(255) DEFAULT NULL,
            \`full_name\` VARCHAR(100) DEFAULT NULL,
            \`phone\` VARCHAR(20) DEFAULT NULL,
            \`email\` VARCHAR(100) DEFAULT NULL,
            \`role\` VARCHAR(20) DEFAULT 'rider',
            \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `);
        const [[profileRecord]] = await db.query('SELECT * FROM profiles WHERE id = ?', [profileId]);
        if (profileRecord) {
          await db.query(
            `INSERT IGNORE INTO waste (id, firebase_uid, username, password_hash, full_name, phone, email, role, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              profileRecord.id,
              profileRecord.firebase_uid,
              profileRecord.username,
              profileRecord.password_hash,
              profileRecord.full_name,
              profileRecord.phone,
              profileRecord.email,
              profileRecord.role
            ]
          );
        }
      } catch (err) {
        console.warn('[adminController] Failed to back up profile to waste table:', err.message);
      }

      // Delete profile (cascade will handle other related data)
      await db.query('DELETE FROM profiles WHERE id = ?', [profileId]);

      // Log admin action
      await AuditService.logAdminAction({
        adminId: req.user.id,
        action: 'DRIVER_DELETED',
        affectedId: String(driverId),
        affectedTable: 'driver_profiles',
        ipAddress: req.ip,
      }).catch(() => {});

      console.log(`[adminController] Driver ${driverId} (Profile: ${profileId}) deleted successfully`);

      return res.json({
        success: true,
        message: 'Driver and all associated data have been deleted successfully'
      });
    } catch (err) {
      console.error('[adminController] Error deleting driver:', err.message);
      next(err);
    }
  },

  async blockUser(req, res, next) {
    try {
      const profileId = req.params.id;
      await AdminRepository.setAccountStatus(profileId, 'blocked');

      await AuditService.logAdminAction({
        adminId: req.user.id,
        action: 'USER_BLOCKED',
        affectedId: profileId,
        affectedTable: 'profiles',
        ipAddress: req.ip,
      }).catch(() => {});

      return sendSuccess(res, 'User account blocked.');
    } catch (err) {
      next(err);
    }
  },

  async unblockUser(req, res, next) {
    try {
      const profileId = req.params.id;
      await AdminRepository.setAccountStatus(profileId, 'active');
      return sendSuccess(res, 'User account activated.');
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const profileId = req.params.id;

      // Fetch profile before deleting so we can back it up
      const [[profileRecord]] = await db.query('SELECT * FROM profiles WHERE id = ?', [profileId]);
      if (!profileRecord) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Create waste table if needed and backup profile
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS \`waste\` (
            \`id\` CHAR(36) NOT NULL,
            \`firebase_uid\` VARCHAR(128) DEFAULT NULL,
            \`username\` VARCHAR(50) DEFAULT NULL,
            \`password_hash\` VARCHAR(255) DEFAULT NULL,
            \`full_name\` VARCHAR(100) DEFAULT NULL,
            \`phone\` VARCHAR(20) DEFAULT NULL,
            \`email\` VARCHAR(100) DEFAULT NULL,
            \`role\` VARCHAR(20) DEFAULT 'rider',
            \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `);
        await db.query(
          `INSERT IGNORE INTO waste (id, firebase_uid, username, password_hash, full_name, phone, email, role, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            profileRecord.id,
            profileRecord.firebase_uid || null,
            profileRecord.username || null,
            profileRecord.password_hash || null,
            profileRecord.full_name || null,
            profileRecord.phone || null,
            profileRecord.email || null,
            profileRecord.role || 'rider'
          ]
        );
      } catch (err) {
        console.warn('[adminController] Failed to back up profile to waste table:', err.message);
      }

      // Delete wallet transactions first (foreign key)
      await db.query(
        `DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE profile_id = ?)`,
        [profileId]
      );
      await db.query('DELETE FROM wallets WHERE profile_id = ?', [profileId]);

      // Delete the profile (cascade handles rides, sessions, etc.)
      await db.query('DELETE FROM profiles WHERE id = ?', [profileId]);

      await AuditService.logAdminAction({
        adminId: req.user.id,
        action: 'USER_DELETED',
        affectedId: profileId,
        affectedTable: 'profiles',
        ipAddress: req.ip,
      }).catch(() => {});

      console.log(`[adminController] User ${profileId} deleted and backed up to waste table.`);

      return res.json({ success: true, message: 'User and all associated data have been permanently deleted.' });
    } catch (err) {
      console.error('[adminController] Error deleting user:', err.message);
      next(err);
    }
  },

  async getRides(req, res, next) {
    try {
      const { page, limit, offset, search, status } = parsePagination(req.query);
      const { dateFilter, startDate, endDate } = req.query;
      const rows = await AdminRepository.listRides({ limit, offset, search, status, dateFilter, startDate, endDate });
      return sendSuccess(res, 'Rides retrieved.', rows);
    } catch (err) {
      next(err);
    }
  },

  async getReportData(req, res, next) {
    try {
      const { reportType = 'revenue', startDate, endDate } = req.query;
      const data = await AdminRepository.getReportData({ reportType, startDate, endDate });

      await AuditService.logAdminAction({
        adminId: req.user?.id || 'system',
        action: 'REPORT_DOWNLOADED',
        affectedTable: 'rides',
        details: { reportType, startDate, endDate },
        ipAddress: req.ip,
      }).catch(() => {});

      return sendSuccess(res, 'Report data retrieved.', data);
    } catch (err) {
      next(err);
    }
  },

  async getSettings(req, res, next) {
    try {
      const settings = await AdminRepository.getAppSettings();
      return sendSuccess(res, 'App settings retrieved.', settings);
    } catch (err) {
      next(err);
    }
  },

  async updateSetting(req, res, next) {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) return sendError(res, 'key and value required.', ErrorCodes.VALIDATION_FAILED);
      await AdminRepository.updateAppSetting(key, String(value));

      // When auto_approve is turned ON, bulk-approve all currently pending drivers
      if (key === 'auto_approve' && String(value) === 'true') {
        try {
          await db.query(
            `UPDATE driver_profiles SET verification_status = 'approved', updated_at = NOW()
             WHERE verification_status IN ('pending', 'Pending')`
          );
          console.log('[adminController] auto_approve enabled — bulk approved all pending drivers.');
        } catch (e) {
          console.warn('[adminController] Bulk-approve failed:', e.message);
        }
      }

      return sendSuccess(res, `Setting "${key}" updated.`);
    } catch (err) {
      next(err);
    }
  },

  // Bulk-save all platform settings at once
  async updateSettings(req, res, next) {
    try {
      const { settings } = req.body; // array of { key, value }
      if (!Array.isArray(settings) || settings.length === 0) {
        return sendError(res, 'settings array required.', ErrorCodes.VALIDATION_FAILED);
      }

      for (const { key, value } of settings) {
        if (!key || value === undefined) continue;
        await AdminRepository.updateAppSetting(key, String(value));
      }

      // Handle auto_approve bulk action
      const autoApproveSetting = settings.find(s => s.key === 'auto_approve');
      if (autoApproveSetting && String(autoApproveSetting.value) === 'true') {
        try {
          await db.query(
            `UPDATE driver_profiles SET verification_status = 'approved', updated_at = NOW()
             WHERE verification_status IN ('pending', 'Pending')`
          );
          console.log('[adminController] updateSettings: bulk approved all pending drivers.');
        } catch (e) {
          console.warn('[adminController] Bulk-approve failed:', e.message);
        }
      }

      return sendSuccess(res, 'Platform settings saved successfully.');
    } catch (err) {
      next(err);
    }
  },

  async getWalletStats(req, res, next) {
    try {
      const { WalletRepository } = await import('../repositories/walletRepository.js');
      const { search, status, dateFrom, dateTo, limit, offset } = req.query;
      const data = await WalletRepository.getAdminWalletStats({
        search: search || '',
        status: status || '',
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      return sendSuccess(res, 'Admin wallet metrics retrieved.', data);
    } catch (err) {
      next(err);
    }
  },

  async getSettlements(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const data = await SettlementService.getAllSettlements(req.query);
      return sendSuccess(res, 'Settlement requests retrieved.', data);
    } catch (err) {
      next(err);
    }
  },

  async approveSettlement(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const result = await SettlementService.approveSettlement(req.params.id, req.body.notes);
      return sendSuccess(res, 'Settlement request approved.', result);
    } catch (err) {
      next(err);
    }
  },

  async rejectSettlement(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const result = await SettlementService.rejectSettlement(req.params.id, req.body.reason);
      return sendSuccess(res, 'Settlement request rejected.', result);
    } catch (err) {
      next(err);
    }
  },

  async markSettlementPaid(req, res, next) {
    try {
      const { SettlementService } = await import('../services/settlementService.js');
      const result = await SettlementService.markPaid(
        req.params.id,
        req.body.txnReference || req.body.transactionReference || '',
        req.body.notes || 'Marked Paid by Admin'
      );
      return sendSuccess(res, 'Settlement marked as Paid.', result);
    } catch (err) {
      next(err);
    }
  },

  async getMySQLBackup(req, res, next) {
    try {
      const { BackupService } = await import('../services/backupService.js');
      const backup = await BackupService.getMySQLBackup();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=zipride_mysql_backup_${Date.now()}.json`);
      return res.json(backup);
    } catch (err) {
      next(err);
    }
  },

  async getMongoBackup(req, res, next) {
    try {
      const { BackupService } = await import('../services/backupService.js');
      const backup = await BackupService.getMongoBackup();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=zipride_mongo_backup_${Date.now()}.json`);
      return res.json(backup);
    } catch (err) {
      next(err);
    }
  },

  async restoreBackup(req, res, next) {
    try {
      const { BackupService } = await import('../services/backupService.js');
      const result = await BackupService.restoreBackup(req.body);
      return sendSuccess(res, 'Backup restore status.', result);
    } catch (err) {
      next(err);
    }
  },

  async exportData(req, res, next) {
    try {
      const { BackupService } = await import('../services/backupService.js');
      const { type = 'csv', category = 'rides' } = req.query;
      const result = await BackupService.exportData(type, category);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      return res.send(result.content);
    } catch (err) {
      next(err);
    }
  }
};

export default AdminController;
