import express from 'express';
import DocumentController from '../controllers/documentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

// Get driver documents by profile ID - requires authentication
router.get('/driver/:profileId', requireAuth, DocumentController.getDriverDocuments);

// Update verification status - admin only
router.put('/verify/:profileId', requireAuth, requireAdmin, DocumentController.updateVerificationStatus);

// Get all pending verifications - admin only
router.get('/pending', requireAuth, requireAdmin, DocumentController.getPendingVerifications);

// Get all verifications - admin only
router.get('/all', requireAuth, requireAdmin, DocumentController.getAllVerifications);

export default router;
