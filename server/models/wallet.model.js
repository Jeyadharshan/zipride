import { dbGet, dbRun, dbAll } from '../config/database.js';

export const WalletModel = {
  async findByUserId(userId) {
    return dbGet('SELECT * FROM wallets WHERE id = ?', [userId]);
  },

  async create(userId, balance = 0.00) {
    await dbRun('INSERT INTO wallets (id, balance) VALUES (?, ?)', [userId, balance]);
    return this.findByUserId(userId);
  },

  async updateBalance(userId, amount) {
    // 1. Get current balance
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      await this.create(userId, amount);
    } else {
      const newBalance = wallet.balance + amount;
      await dbRun("UPDATE wallets SET balance = ?, updated_at = datetime('now') WHERE id = ?", [newBalance, userId]);
    }
    return this.findByUserId(userId);
  },

  async addTransaction(transactionData) {
    const { id, wallet_id, amount, type, description } = transactionData;
    
    // 1. Insert transaction record
    await dbRun(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description)
       VALUES (?, ?, ?, ?, ?)`,
      [id, wallet_id, amount, type, description]
    );

    // 2. Adjust wallet balance
    await this.updateBalance(wallet_id, amount);

    return dbGet('SELECT * FROM wallet_transactions WHERE id = ?', [id]);
  },

  async getTransactions(walletId) {
    return dbAll(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC',
      [walletId]
    );
  }
};
