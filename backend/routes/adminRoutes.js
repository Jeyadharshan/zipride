import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/dashboard-stats', requireAuth, requireAdmin, AdminController.getDashboardStats);
router.get('/users', requireAuth, requireAdmin, AdminController.getUsers);
router.get('/rides', requireAuth, requireAdmin, AdminController.getRides);
router.get('/reports', requireAuth, requireAdmin, AdminController.getReportData);
router.get('/pending-drivers', requireAuth, requireAdmin, AdminController.getPendingDrivers);
router.get('/drivers', requireAuth, requireAdmin, AdminController.getDriversList);
router.get('/verifications', requireAuth, requireAdmin, AdminController.getDriverVerifications);
router.get('/driver-documents/:profileId', requireAuth, requireAdmin, AdminController.getDriverDocuments);
router.post('/driver/:id/approve', requireAuth, requireAdmin, AdminController.approveDriver);
router.post('/driver/:id/reject', requireAuth, requireAdmin, AdminController.rejectDriver);
router.delete('/driver/:id', requireAuth, requireAdmin, AdminController.deleteDriver);
router.post('/user/:id/block', requireAuth, requireAdmin, AdminController.blockUser);
router.post('/user/:id/unblock', requireAuth, requireAdmin, AdminController.unblockUser);
router.delete('/user/:id', requireAuth, requireAdmin, AdminController.deleteUser);
router.get('/settings', requireAuth, requireAdmin, AdminController.getSettings);
router.put('/settings', requireAuth, requireAdmin, AdminController.updateSetting);
router.put('/settings/bulk', requireAuth, requireAdmin, AdminController.updateSettings);
router.get('/wallet', requireAuth, requireAdmin, AdminController.getWalletStats);
router.get('/settlements', requireAuth, requireAdmin, AdminController.getSettlements);
router.post('/settlement/:id/approve', requireAuth, requireAdmin, AdminController.approveSettlement);
router.post('/settlement/:id/reject', requireAuth, requireAdmin, AdminController.rejectSettlement);

export default router;



