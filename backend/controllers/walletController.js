import { WalletService } from '../services/walletService.js';

export const WalletController = {
  // GET /api/v1/wallet & GET /api/v1/wallet/balance & GET /api/wallet
  async getBalance(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User authentication required.' });
      }
      const summary = await WalletService.getSummary(userId);
      return res.json({
        success: true,
        message: 'Wallet balance retrieved.',
        data: summary || { balance: 0, available_balance: 0, total_added: 0, total_spent: 0 }
      });
    } catch (err) {
      console.warn('[WalletController] getBalance error:', err?.message);
      return res.json({
        success: true,
        message: 'Wallet balance retrieved.',
        data: { balance: 0, available_balance: 0, total_added: 0, total_spent: 0 }
      });
    }
  },

  // POST /api/v1/wallet/add-money
  async addMoneyOrder(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User authentication required.' });
      }
      const { amount } = req.body;
      const result = await WalletService.createAddMoneyOrder(userId, amount);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to create add money order.' });
    }
  },

  // POST /api/v1/wallet/verify-payment
  async verifyAddMoney(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User authentication required.' });
      }
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
      const result = await WalletService.verifyAddMoney({
        userId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount
      });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err?.message || 'Payment verification failed.' });
    }
  },

  // POST /api/v1/wallet/pay
  async payWithWallet(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User authentication required.' });
      }
      const { rideId, amount } = req.body;
      const result = await WalletService.payWithWallet({
        userId,
        rideId,
        amount
      });
      return res.json(result);
    } catch (err) {
      if (err?.code === 'INSUFFICIENT_WALLET_BALANCE') {
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_WALLET_BALANCE',
          message: err.message,
          availableBalance: err.availableBalance,
          requiredAmount: err.requiredAmount
        });
      }
      return res.status(400).json({ success: false, message: err?.message || 'Wallet payment failed.' });
    }
  },

  // GET /api/v1/wallet/history & GET /api/v1/wallet/transactions
  async getTransactions(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json({ success: true, message: 'Wallet transaction history retrieved.', data: [] });
      }
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const list = await WalletService.getHistory(userId, { limit, offset });
      return res.json({
        success: true,
        message: 'Wallet transaction history retrieved.',
        data: Array.isArray(list) ? list : []
      });
    } catch (err) {
      console.warn('[WalletController] getTransactions error:', err?.message);
      return res.json({
        success: true,
        message: 'Wallet transaction history retrieved.',
        data: []
      });
    }
  }
};
