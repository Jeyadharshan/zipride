// backend/repositories/walletRepository.js
// Complete SQL Repository for wallets, wallet_transactions, driver wallets, and admin metrics.

import db from '../config/db.js';

export const WalletRepository = {
  async findByProfileId(profileId) {
    const [rows] = await db.execute(
      `SELECT * FROM wallets WHERE profile_id = ? LIMIT 1`,
      [profileId]
    );
    if (rows[0]) return rows[0];

    // Auto-create wallet if missing
    await db.execute(
      `INSERT IGNORE INTO wallets (profile_id, wallet_balance, wallet_status, created_at, updated_at)
       VALUES (?, 0.00, 'Active', NOW(), NOW())`,
      [profileId]
    );

    const [newRows] = await db.execute(
      `SELECT * FROM wallets WHERE profile_id = ? LIMIT 1`,
      [profileId]
    );
    return newRows[0] || null;
  },

  async findByUserId(profileId) {
    return this.findByProfileId(profileId);
  },

  async getBalance(profileId) {
    const wallet = await this.findByProfileId(profileId);
    return Number(wallet?.wallet_balance || 0);
  },

  async getSummary(profileId) {
    const wallet = await this.findByProfileId(profileId);
    if (!wallet) return null;

    const walletId = wallet.id;

    // Calculate Total Added (Credit / Deposit / Wallet Recharge)
    const [[addedRow]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_added 
       FROM wallet_transactions 
       WHERE wallet_id = ? AND amount > 0 AND status = 'Success'`,
      [walletId]
    );

    // Calculate Total Spent (Debit / Ride Payment / Withdrawal)
    const [[spentRow]] = await db.execute(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total_spent 
       FROM wallet_transactions 
       WHERE wallet_id = ? AND amount < 0 AND status = 'Success'`,
      [walletId]
    );

    // Get Last Recharge details
    const [rechargeRows] = await db.execute(
      `SELECT amount, COALESCE(created_at, transaction_date) AS date
       FROM wallet_transactions 
       WHERE wallet_id = ? AND amount > 0 AND status = 'Success'
       ORDER BY id DESC LIMIT 1`,
      [walletId]
    );

    // Get Last Transaction Time
    const [lastTxRows] = await db.execute(
      `SELECT COALESCE(created_at, transaction_date) AS date
       FROM wallet_transactions 
       WHERE wallet_id = ?
       ORDER BY id DESC LIMIT 1`,
      [walletId]
    );

    const balance = Number(wallet.wallet_balance || 0);

    return {
      wallet_id: wallet.id,
      balance,
      available_balance: balance,
      total_added: Number(addedRow?.total_added || 0),
      total_spent: Number(spentRow?.total_spent || 0),
      last_recharge: rechargeRows[0] ? {
        amount: Number(rechargeRows[0].amount),
        date: rechargeRows[0].date
      } : null,
      last_transaction_time: lastTxRows[0]?.date || wallet.updated_at || wallet.created_at
    };
  },

  async credit(profileId, amount) {
    const wallet = await this.findByProfileId(profileId);
    await db.execute(
      `UPDATE wallets SET wallet_balance = wallet_balance + ?, updated_at = NOW()
       WHERE id = ? AND wallet_status = 'Active'`,
      [amount, wallet.id]
    );
  },

  async debit(profileId, amount) {
    const wallet = await this.findByProfileId(profileId);
    const [result] = await db.execute(
      `UPDATE wallets SET wallet_balance = wallet_balance - ?, updated_at = NOW()
       WHERE id = ? AND wallet_status = 'Active' AND wallet_balance >= ?`,
      [amount, wallet.id, amount]
    );
    return result.affectedRows > 0;
  },

  async addTransaction(walletId, data) {
    const {
      rideId = null,
      paymentId = null,
      transaction_type = 'Credit',
      type = null,
      amount,
      status = 'Success',
      description = ''
    } = data;

    const txType = transaction_type || type || (amount >= 0 ? 'Credit' : 'Debit');

    const [result] = await db.execute(
      `INSERT INTO wallet_transactions (wallet_id, ride_id, payment_id, transaction_type, type, amount, status, description, created_at, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [walletId, rideId, paymentId, txType, txType, amount, status, description]
    );
    return result.insertId;
  },

  async getTransactions(profileId, { limit = 20, offset = 0 } = {}) {
    const wallet = await this.findByProfileId(profileId);
    if (!wallet) return [];

    const safeLimit = Math.max(1, parseInt(limit) || 20);
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const [rows] = await db.execute(
      `SELECT wt.*, 
              COALESCE(wt.created_at, wt.transaction_date) AS date,
              COALESCE(wt.transaction_type, wt.type) AS type_label
       FROM wallet_transactions wt
       WHERE wt.wallet_id = ?
       ORDER BY wt.id DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [wallet.id]
    );
    return rows;
  },

  async countTransactions(profileId) {
    const wallet = await this.findByProfileId(profileId);
    if (!wallet) return 0;
    const [[row]] = await db.execute(
      `SELECT COUNT(*) AS total FROM wallet_transactions WHERE wallet_id = ?`,
      [wallet.id]
    );
    return row?.total || 0;
  },

  // Driver Wallet & Earnings details
  async getDriverWallet(profileId) {
    const [dpRows] = await db.execute(
      `SELECT dp.id AS driver_id, dp.total_earnings, dp.completed_rides, p.full_name
       FROM driver_profiles dp
       JOIN profiles p ON dp.profile_id = p.id
       WHERE dp.profile_id = ? LIMIT 1`,
      [profileId]
    );
    const driver = dpRows[0];
    if (!driver) return null;

    const driverId = driver.driver_id;
    const wallet = await this.findByProfileId(profileId);

    // Today's Earnings
    const [[todayRow]] = await db.execute(
      `SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0) * 0.85), 0) AS total
       FROM rides
       WHERE driver_id = ? AND ride_status IN ('Ride Completed', 'completed')
         AND DATE(completed_time) = CURDATE()`,
      [driverId]
    );

    // Weekly Earnings
    const [[weeklyRow]] = await db.execute(
      `SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0) * 0.85), 0) AS total
       FROM rides
       WHERE driver_id = ? AND ride_status IN ('Ride Completed', 'completed')
         AND YEARWEEK(completed_time, 1) = YEARWEEK(CURDATE(), 1)`,
      [driverId]
    );

    // Monthly Earnings
    const [[monthlyRow]] = await db.execute(
      `SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0) * 0.85), 0) AS total
       FROM rides
       WHERE driver_id = ? AND ride_status IN ('Ride Completed', 'completed')
         AND MONTH(completed_time) = MONTH(CURDATE()) AND YEAR(completed_time) = YEAR(CURDATE())`,
      [driverId]
    );

    // Total Tips Earned
    const [[tipsRow]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM ride_tips WHERE driver_id = ? AND payment_status = 'Success'`,
      [driverId]
    );

    return {
      driver_id: driverId,
      profile_id: profileId,
      full_name: driver.full_name,
      wallet_balance: Number(wallet?.wallet_balance || 0),
      total_earnings: Number(driver.total_earnings || 0),
      today_earnings: Number(todayRow?.total || 0),
      weekly_earnings: Number(weeklyRow?.total || 0),
      monthly_earnings: Number(monthlyRow?.total || 0),
      tips_earned: Number(tipsRow?.total || 0),
      pending_settlement: Math.round(Number(driver.total_earnings || 0) * 0.10 * 100) / 100,
      completed_rides: Number(driver.completed_rides || 0),
      withdraw_history: []
    };
  },

  // Admin Wallet Dashboard Metrics & Transaction Filters
  async getAdminWalletStats({ search = '', status = '', dateFrom = '', dateTo = '', limit = 50, offset = 0 } = {}) {
    // Total Wallet Balance across all user wallets
    const [[balanceRow]] = await db.execute(
      `SELECT COALESCE(SUM(wallet_balance), 0) AS total_wallet_balance FROM wallets`
    );

    // Total Recharges via Razorpay / Credit
    const [[rechargeRow]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_recharge 
       FROM wallet_transactions 
       WHERE amount > 0 AND status = 'Success'`
    );

    // Total Wallet Payments spent on rides
    const [[walletPayRow]] = await db.execute(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total_wallet_payments 
       FROM wallet_transactions 
       WHERE amount < 0 AND status = 'Success'`
    );

    // Total Tips Paid
    const [[tipsRow]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_tips FROM ride_tips WHERE payment_status = 'Success'`
    );

    // Total Driver Earnings
    const [[earningsRow]] = await db.execute(
      `SELECT COALESCE(SUM(total_earnings), 0) AS total_driver_earnings FROM driver_profiles`
    );

    let sql = `
      SELECT wt.*, 
             COALESCE(wt.created_at, wt.transaction_date) AS date,
             p.full_name AS user_name, p.phone AS user_phone, p.role AS user_role,
             w.profile_id
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN profiles p ON w.profile_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (p.full_name LIKE ? OR p.phone LIKE ? OR wt.description LIKE ? OR wt.id = ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, search);
    }

    if (status) {
      sql += ` AND wt.status = ?`;
      params.push(status);
    }

    if (dateFrom) {
      sql += ` AND DATE(COALESCE(wt.created_at, wt.transaction_date)) >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND DATE(COALESCE(wt.created_at, wt.transaction_date)) <= ?`;
      params.push(dateTo);
    }

    const safeLimit = Math.max(1, parseInt(limit) || 50);
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    sql += ` ORDER BY wt.id DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [transactions] = await db.execute(sql, params);

    return {
      total_wallet_balance: Number(balanceRow?.total_wallet_balance || 0),
      total_recharge: Number(rechargeRow?.total_recharge || 0),
      total_wallet_payments: Number(walletPayRow?.total_wallet_payments || 0),
      total_tips: Number(tipsRow?.total_tips || 0),
      total_driver_earnings: Number(earningsRow?.total_driver_earnings || 0),
      transactions
    };
  }
};

export default WalletRepository;
