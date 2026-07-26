import express from 'express';
import { DriverController } from '../controllers/driverController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDriver, requireVerifiedDriver } from '../middleware/driver.js';
import upload, { validateDriverDocumentFiles, processUploadedFiles } from '../middleware/upload.js';

const router = express.Router();

const docUploads = upload.fields([
  { name: 'licenseImage', maxCount: 1 },
  { name: 'profilePhoto', maxCount: 1 }
]);

router.get('/profile', requireAuth, requireDriver, DriverController.getProfile);
router.put('/profile', requireAuth, requireDriver, DriverController.updateProfile);
router.get('/vehicle', requireAuth, requireDriver, DriverController.getVehicle);
router.get('/wallet', requireAuth, requireDriver, DriverController.getDriverWallet);
router.get('/settlement', requireAuth, requireDriver, DriverController.getSettlement);
router.post('/settlement/request', requireAuth, requireDriver, DriverController.requestSettlement);
router.post('/location', requireAuth, requireVerifiedDriver, DriverController.updateLocation);
router.post('/upload-docs', requireAuth, requireDriver, docUploads, validateDriverDocumentFiles, processUploadedFiles, DriverController.uploadDocuments);

export default router;
