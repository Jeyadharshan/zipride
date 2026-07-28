import crypto from 'crypto';
import db from '../config/db.js';
import { getRazorpay } from '../config/razorpay.js';
import { WalletRepository } from '../repositories/walletRepository.js';
import { RideRepository } from '../repositories/rideRepository.js';
import { NotificationService } from './notificationService.js';

export const TipService = {
  async addTip({ riderId, rideId, amount, paymentMethod = 'Wallet', razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount <= 0) {
      throw new Error('Tip amount must be a positive number.');
    }

    const ride = await RideRepository.findById(rideId);
    if (!ride) {
      throw new Error('Ride not found.');
    }

    const driverId = ride.driver_id;
    if (!driverId) {
      throw new Error('Driver not assigned to this ride.');
    }

    if (paymentMethod === 'Wallet') {
      const summary = await WalletRepository.getSummary(riderId);
      if (summary.balance < tipAmount) {
        const err = new Error(`Insufficient Wallet Balance for tip. Available: ₹${summary.balance}`);
        err.code = 'INSUFFICIENT_WALLET_BALANCE';
        throw err;
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // Deduct wallet balance
        const [deductRes] = await conn.execute(
          `UPDATE wallets SET wallet_balance = wallet_balance - ?, updated_at = NOW()
           WHERE id = ? AND wallet_balance >= ?`,
          [tipAmount, summary.wallet_id, tipAmount]
        );
        if (deductRes.affectedRows === 0) {
          throw new Error('Insufficient Wallet Balance for tip.');
        }

        // Log wallet transaction
        await conn.execute(
          `INSERT INTO wallet_transactions (wallet_id, ride_id, transaction_type, type, amount, status, description, created_at, transaction_date)
           VALUES (?, ?, NULL, 'Debit', 'Tip Payment', ?, 'Success', ?, NOW(), NOW())`,
          [summary.wallet_id, rideId, -tipAmount, `Driver Tip for Trip #${rideId}`]
        );

        // Record in ride_tips
        await conn.execute(
          `INSERT INTO ride_tips (ride_id, driver_id, rider_id, amount, payment_method, payment_status, created_at)
           VALUES (?, ?, ?, ?, 'Wallet', 'Success', NOW())`,
          [rideId, driverId, riderId, tipAmount]
        );

        // Credit Driver Earnings
        await conn.execute(
          `UPDATE driver_profiles SET total_earnings = total_earnings + ?, updated_at = NOW() WHERE id = ? OR profile_id = ?`,
          [tipAmount, driverId, driverId]
        );

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      // Notify Driver
      try {
        const driverProfileId = ride.driver_profile_id || driverId;
        await NotificationService.sendPushNotification(
          driverProfileId,
          'Tip Received',
          `You received ₹${tipAmount} as a Tip!`
        ).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        message: `₹${tipAmount} tip sent to driver via Wallet.`
      };
    } else if (paymentMethod === 'Razorpay') {
      // If creating order
      if (!razorpay_payment_id) {
        const razorpay = getRazorpay();
        if (!razorpay) {
          throw new Error("Razorpay is not configured.");
        }
        const amountInPaise = Math.round(tipAmount * 100);
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `tip_${rideId}_${Date.now()}`
        });

        return {
          success: true,
          action: 'checkout',
          razorpay_order_id: order.id,
          amount: tipAmount,
          currency: 'INR',
          key_id: process.env.RAZORPAY_KEY_ID
        };
      }

      // Verify Razorpay HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        throw new Error('Razorpay signature verification failed for tip.');
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        await conn.execute(
          `INSERT INTO ride_tips (ride_id, driver_id, rider_id, amount, payment_method, payment_status, transaction_id, created_at)
           VALUES (?, ?, ?, ?, 'Razorpay', 'Success', ?, NOW())`,
          [rideId, driverId, riderId, tipAmount, razorpay_payment_id]
        );

        await conn.execute(
          `UPDATE driver_profiles SET total_earnings = total_earnings + ?, updated_at = NOW() WHERE id = ? OR profile_id = ?`,
          [tipAmount, driverId, driverId]
        );

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      // Notify Driver
      try {
        const driverProfileId = ride.driver_profile_id || driverId;
        await NotificationService.sendPushNotification(
          driverProfileId,
          'Tip Received',
          `You received ₹${tipAmount} as a Tip!`
        ).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        message: `₹${tipAmount} tip sent to driver via Razorpay.`
      };
    } else {
      throw new Error('Invalid tip payment method.');
    }
  }
};

export default TipService;
