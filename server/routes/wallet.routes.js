import express from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', WalletController.getBalance);
router.post('/add', WalletController.addFunds);
router.post('/deduct', WalletController.deductFunds);
router.get('/transactions', WalletController.getTransactions);

export default router;
