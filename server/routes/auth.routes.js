import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', AuthController.registerRider);
router.post('/register/driver', AuthController.registerDriver);
router.post('/login', AuthController.login);
router.post('/google-login', AuthController.googleLogin);
router.post('/send-email-otp', AuthController.sendEmailOtp);
router.post('/verify-email-otp', AuthController.verifyEmailOtp);
router.get('/me', requireAuth, AuthController.me);

export default router;
