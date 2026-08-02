import { WalletService } from '../services/wallet.service.js';

export const WalletController = {
  async getBalance(req, res, next) {
    try {
      const wallet = await WalletService.getBalance(req.user.id);
      res.json({ data: wallet });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async addFunds(req, res, next) {
    try {
      const { amount, description } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: { message: 'Invalid deposit amount' } });
      }
      const tx = await WalletService.addFunds(req.user.id, parsedAmount, description);
      res.json({ data: tx });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async deductFunds(req, res, next) {
    try {
      const { amount, description } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: { message: 'Invalid deduction amount' } });
      }
      const tx = await WalletService.deductFunds(req.user.id, parsedAmount, description);
      res.json({ data: tx });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getTransactions(req, res, next) {
    try {
      const txs = await WalletService.getTransactions(req.user.id);
      res.json({ data: txs });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
