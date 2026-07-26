import express from 'express';
import { WalletController } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, WalletController.getBalance);
router.get('/balance', requireAuth, WalletController.getBalance);
router.post('/add-money', requireAuth, WalletController.addMoneyOrder);
router.post('/verify-payment', requireAuth, WalletController.verifyAddMoney);
router.post('/pay', requireAuth, WalletController.payWithWallet);
router.get('/history', requireAuth, WalletController.getTransactions);
router.get('/transactions', requireAuth, WalletController.getTransactions);

export default router;
