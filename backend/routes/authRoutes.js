import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { registerRiderValidationRules, loginValidationRules, validateRequest } from '../middleware/validation.js';
import upload, { validateDriverDocumentFiles, processUploadedFiles } from '../middleware/upload.js';

const router = express.Router();

const driverUploads = upload.fields([
  { name: 'licenseImage', maxCount: 1 },
  { name: 'rcBook', maxCount: 1 },
  { name: 'insurance', maxCount: 1 },
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]);

router.post('/register', registerRiderValidationRules, validateRequest, AuthController.register);

// Custom driver files uploading middleware
router.post('/register/driver', driverUploads, validateDriverDocumentFiles, processUploadedFiles, AuthController.registerDriver);

router.post('/login', loginValidationRules, validateRequest, AuthController.login);
router.post('/logout', requireAuth, AuthController.logout);
router.post('/reset-password', AuthController.resetPassword);
router.post('/refresh', AuthController.refreshToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);

export default router;
