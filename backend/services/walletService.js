// backend/services/walletService.js
// Complete Wallet Service with Razorpay Add Money, HMAC verification, Pay with Wallet, and Push Notifications.

import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import db from '../config/db.js';
import { WalletRepository } from '../repositories/walletRepository.js';
import { RideRepository } from '../repositories/rideRepository.js';
import { DriverRepository } from '../repositories/driverRepository.js';
import { NotificationService } from './notificationService.js';

export const WalletService = {
  async getBalance(userId) {
    return WalletRepository.getSummary(userId);
  },

  async getSummary(userId) {
    return WalletRepository.getSummary(userId);
  },

  // 1. Create Razorpay order to Add Money to Rider Wallet
  async createAddMoneyOrder(userId, amount) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Deposit amount must be a positive number.');
    }

    const wallet = await WalletRepository.findByProfileId(userId);
    if (!wallet) {
      throw new Error('User wallet not found.');
    }

    const amountInPaise = Math.round(parsedAmount * 100);
    const receipt = `wrecharge_${wallet.id}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        walletId: wallet.id,
        purpose: 'Wallet Recharge'
      }
    });

    return {
      success: true,
      razorpay_order_id: order.id,
      amount: parsedAmount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID
    };
  },

  // 2. Verify Razorpay HMAC signature & Credit Wallet Balance atomically
  async verifyAddMoney({ userId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing Razorpay verification parameters.');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET environment variable is missing.');
    }

    // Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[Wallet] ❌ Signature mismatch for order: ${razorpay_order_id}`);
      throw new Error('Razorpay signature verification failed.');
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      throw new Error('Invalid recharge amount.');
    }

    const wallet = await WalletRepository.findByProfileId(userId);

    // Prevent duplicate processing if transaction exists
    const [existingTx] = await db.execute(
      `SELECT id FROM wallet_transactions WHERE wallet_id = ? AND description LIKE ? LIMIT 1`,
      [wallet.id, `%${razorpay_payment_id}%`]
    );
    if (existingTx[0]) {
      const summary = await WalletRepository.getSummary(userId);
      return {
        success: true,
        message: 'Wallet recharge already processed.',
        balance: summary.balance
      };
    }

    // Perform DB Transaction for atomic wallet balance update
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Credit wallet
      await conn.execute(
        `UPDATE wallets SET wallet_balance = wallet_balance + ?, updated_at = NOW() WHERE id = ?`,
        [creditAmount, wallet.id]
      );

      // Record in payments table
      await conn.execute(
        `INSERT INTO payments (ride_id, amount, status, payment_method, gateway, gateway_order_id, transaction_id, created_time, completed_time)
         VALUES (NULL, ?, 'Success', 'UPI', 'Razorpay', ?, ?, NOW(), NOW())`,
        [creditAmount, razorpay_order_id, razorpay_payment_id]
      );
      const [payRes] = await conn.execute(`SELECT LAST_INSERT_ID() AS insertId`);
      const paymentId = payRes[0]?.insertId || null;

      // Record in wallet_transactions
      await conn.execute(
        `INSERT INTO wallet_transactions (wallet_id, ride_id, payment_id, transaction_type, type, amount, status, description, created_at, transaction_date)
         VALUES (?, NULL, ?, 'Credit', 'Wallet Recharge', ?, 'Success', ?, NOW(), NOW())`,
        [wallet.id, paymentId, creditAmount, `Wallet Recharge via Razorpay (${razorpay_payment_id})`]
      );

      await conn.commit();
      console.log(`[Wallet] ✅ ₹${creditAmount} credited to wallet for profile ${userId}`);
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // Send Push Notification to Rider
    try {
      await NotificationService.sendPushNotification(
        userId,
        'Wallet Recharged',
        `₹${creditAmount} added to Wallet`
      ).catch(() => {});
    } catch (e) {}

    const summary = await WalletRepository.getSummary(userId);
    return {
      success: true,
      message: `₹${creditAmount} added to Wallet successfully.`,
      balance: summary.balance,
      summary
    };
  },

  // 3. Pay for Ride using Rider Wallet Balance
  async payWithWallet({ userId, rideId, amount }) {
    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const ride = await RideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found.');
    }

    const summary = await WalletRepository.getSummary(userId);
    if (summary.balance < reqAmount) {
      const err = new Error(`Insufficient Wallet Balance. Available: ₹${summary.balance}, Required: ₹${reqAmount}`);
      err.code = 'INSUFFICIENT_WALLET_BALANCE';
      err.availableBalance = summary.balance;
      err.requiredAmount = reqAmount;
      throw err;
    }

    // Prevent double payment
    if (ride.payment_status === 'Paid' || ride.ride_status === 'Ride Completed') {
      return {
        success: true,
        message: 'Ride is already paid and completed.',
        rideStatus: 'Ride Completed',
        paymentStatus: 'Paid'
      };
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Deduct wallet balance
      const [deductRes] = await conn.execute(
        `UPDATE wallets SET wallet_balance = wallet_balance - ?, updated_at = NOW()
         WHERE id = ? AND wallet_balance >= ?`,
        [reqAmount, summary.wallet_id, reqAmount]
      );

      if (deductRes.affectedRows === 0) {
        throw new Error('Insufficient Wallet Balance.');
      }

      // Record in payments
      await conn.execute(
        `INSERT INTO payments (ride_id, amount, status, payment_method, gateway, created_time, completed_time)
         VALUES (?, ?, 'Success', 'Wallet', 'Wallet', NOW(), NOW())`,
        [rideId, reqAmount]
      );
      const [payRes] = await conn.execute(`SELECT LAST_INSERT_ID() AS insertId`);
      const paymentId = payRes[0]?.insertId || null;

      // Record in wallet_transactions
      await conn.execute(
        `INSERT INTO wallet_transactions (wallet_id, ride_id, payment_id, transaction_type, type, amount, status, description, created_at, transaction_date)
         VALUES (?, ?, ?, 'Debit', 'Ride Payment', ?, 'Success', ?, NOW(), NOW())`,
        [summary.wallet_id, rideId, paymentId, -reqAmount, `Ride Payment for Trip #${rideId}`]
      );

      // Update Ride Status & Payment Status
      await conn.execute(
        `UPDATE rides SET ride_status = 'Ride Completed', payment_status = 'Paid', completed_time = NOW(), updated_at = NOW() WHERE id = ?`,
        [rideId]
      );

      // Log ride status history
      await conn.execute(
        `INSERT INTO ride_status_history (ride_id, ride_status, created_at) VALUES (?, 'Ride Completed', NOW())`,
        [rideId]
      ).catch(() => {});

      // Credit Driver Earnings (85% driver cut)
      if (ride.driver_id) {
        const driverCut = Math.round(reqAmount * 0.85 * 100) / 100;
        await conn.execute(
          `UPDATE driver_profiles SET total_earnings = total_earnings + ?, completed_rides = completed_rides + 1, total_rides = total_rides + 1, is_online = 1, updated_at = NOW() WHERE id = ? OR profile_id = ?`,
          [driverCut, ride.driver_id, ride.driver_id]
        );
      }

      await conn.commit();
      console.log(`[Wallet] ✅ Ride #${rideId} paid via Wallet (₹${reqAmount})`);
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // Release driver back to online/available
    if (ride.driver_id) {
      await DriverRepository.releaseDriver(ride.driver_id).catch(() => {});
    }

    // Send Notifications
    try {
      await NotificationService.sendPushNotification(userId, 'Payment Successful', `₹${reqAmount} paid via Wallet. Ride Completed!`).catch(() => {});
      if (ride.driver_id) {
        const driverProfileId = ride.driver_profile_id || ride.driver_id;
        const driverCut = Math.round(reqAmount * 0.85 * 100) / 100;
        await NotificationService.sendPushNotification(driverProfileId, 'Payment Received', `You received ₹${driverCut} for completed ride.`).catch(() => {});
      }
    } catch (e) {}

    return {
      success: true,
      message: 'Payment completed via Wallet.',
      rideStatus: 'Ride Completed',
      paymentStatus: 'Paid'
    };
  },

  async getHistory(userId, { limit = 20, offset = 0 } = {}) {
    return WalletRepository.getTransactions(userId, { limit, offset });
  }
};

export default WalletService;
