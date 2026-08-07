import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/dashboard-stats', requireAuth, requireAdmin, AdminController.getDashboardStats);
router.get('/analytics', requireAuth, requireAdmin, AdminController.getAnalytics);
router.get('/users', requireAuth, requireAdmin, AdminController.getUsers);
router.get('/rides', requireAuth, requireAdmin, AdminController.getRides);
router.get('/reports', requireAuth, requireAdmin, AdminController.getReportData);
router.get('/pending-drivers', requireAuth, requireAdmin, AdminController.getPendingDrivers);
router.get('/drivers', requireAuth, requireAdmin, AdminController.getDriversList);
router.get('/verifications', requireAuth, requireAdmin, AdminController.getDriverVerifications);
router.get('/driver-documents/:profileId', requireAuth, requireAdmin, AdminController.getDriverDocuments);
router.post('/driver/:id/approve', requireAuth, requireAdmin, AdminController.approveDriver);
router.post('/driver/:id/reject', requireAuth, requireAdmin, AdminController.rejectDriver);
router.get('/driver/:id/location', requireAuth, requireAdmin, AdminController.getDriverLocation);
router.get('/driver/:driverId/location', requireAuth, requireAdmin, AdminController.getDriverLocation);
router.get('/drivers/:id/location', requireAuth, requireAdmin, AdminController.getDriverLocation);
router.get('/drivers/:driverId/location', requireAuth, requireAdmin, AdminController.getDriverLocation);
router.delete('/driver/:id', requireAuth, requireAdmin, AdminController.deleteDriver);
router.post('/user/:id/block', requireAuth, requireAdmin, AdminController.blockUser);
router.post('/user/:id/unblock', requireAuth, requireAdmin, AdminController.unblockUser);
router.delete('/user/:id', requireAuth, requireAdmin, AdminController.deleteUser);
router.get('/settings', requireAuth, requireAdmin, AdminController.getSettings);
router.put('/settings', requireAuth, requireAdmin, AdminController.updateSetting);
router.put('/settings/bulk', requireAuth, requireAdmin, AdminController.updateSettings);
router.get('/wallet', requireAuth, requireAdmin, AdminController.getWalletStats);
router.get('/settlements', requireAuth, requireAdmin, AdminController.getSettlements);
router.get('/settlement', requireAuth, requireAdmin, AdminController.getSettlements);
router.post('/settlement/:id/approve', requireAuth, requireAdmin, AdminController.approveSettlement);
router.post('/settlements/:id/approve', requireAuth, requireAdmin, AdminController.approveSettlement);
router.post('/settlement/:id/reject', requireAuth, requireAdmin, AdminController.rejectSettlement);
router.post('/settlements/:id/reject', requireAuth, requireAdmin, AdminController.rejectSettlement);
router.post('/settlement/:id/mark-paid', requireAuth, requireAdmin, AdminController.markSettlementPaid);
router.post('/settlements/:id/mark-paid', requireAuth, requireAdmin, AdminController.markSettlementPaid);
router.get('/backup/mysql', requireAuth, requireAdmin, AdminController.getMySQLBackup);
router.get('/backup/mongo', requireAuth, requireAdmin, AdminController.getMongoBackup);
router.post('/backup/restore', requireAuth, requireAdmin, AdminController.restoreBackup);
router.get('/export', requireAuth, requireAdmin, AdminController.exportData);

export default router;



