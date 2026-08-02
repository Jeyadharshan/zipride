import crypto from 'crypto';
import { WalletModel } from '../models/wallet.model.js';

export const WalletService = {
  async getBalance(userId) {
    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) {
      return WalletModel.create(userId, 0.00);
    }
    return wallet;
  },

  async addFunds(userId, amount, description = 'Deposit funds') {
    if (amount <= 0) throw new Error('Deposit amount must be greater than zero.');
    return WalletModel.addTransaction({
      id: crypto.randomUUID(),
      wallet_id: userId,
      amount: amount,
      type: 'deposit',
      description
    });
  },

  async deductFunds(userId, amount, description = 'Deduct funds') {
    if (amount <= 0) throw new Error('Deduction amount must be greater than zero.');
    
    const wallet = await this.getBalance(userId);
    if (wallet.balance < amount) throw new Error('Insufficient wallet balance.');

    return WalletModel.addTransaction({
      id: crypto.randomUUID(),
      wallet_id: userId,
      amount: -amount,
      type: 'withdrawal',
      description
    });
  },

  async getTransactions(userId) {
    const wallet = await this.getBalance(userId);
    return WalletModel.getTransactions(wallet.id);
  }
};
