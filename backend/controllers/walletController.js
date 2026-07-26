import { WalletService } from '../services/walletService.js';

export const WalletController = {
  // GET /api/v1/wallet
  async getBalance(req, res, next) {
    try {
      const summary = await WalletService.getSummary(req.user.id);
      return res.json({
        success: true,
        message: 'Wallet balance retrieved.',
        data: summary
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallet/add-money
  async addMoneyOrder(req, res, next) {
    try {
      const { amount } = req.body;
      const result = await WalletService.createAddMoneyOrder(req.user.id, amount);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /api/v1/wallet/verify-payment
  async verifyAddMoney(req, res, next) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
      const result = await WalletService.verifyAddMoney({
        userId: req.user.id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount
      });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  // POST /api/v1/wallet/pay
  async payWithWallet(req, res, next) {
    try {
      const { rideId, amount } = req.body;
      const result = await WalletService.payWithWallet({
        userId: req.user.id,
        rideId,
        amount
      });
      return res.json(result);
    } catch (err) {
      if (err.code === 'INSUFFICIENT_WALLET_BALANCE') {
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_WALLET_BALANCE',
          message: err.message,
          availableBalance: err.availableBalance,
          requiredAmount: err.requiredAmount
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  // GET /api/v1/wallet/history
  async getTransactions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const list = await WalletService.getHistory(req.user.id, { limit, offset });
      return res.json({
        success: true,
        message: 'Wallet transaction history retrieved.',
        data: list
      });
    } catch (err) {
      next(err);
    }
  }
};
