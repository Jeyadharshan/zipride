// backend/controllers/webhookController.js
// Razorpay Webhooks Processing Engine — Never trust frontend alone for payment verification

import crypto from 'crypto';
import db from '../config/db.js';
import { WalletRepository } from '../repositories/walletRepository.js';
import { NotificationService } from '../services/notificationService.js';
import { AuditService } from '../services/auditService.js';
import { sendToUser } from '../socket/socket.js';

export const WebhookController = {
  async handleRazorpayWebhook(req, res) {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'oel4hBwegXym8DomFaVJ2gvl';
      const signature = req.headers['x-razorpay-signature'];

      if (!signature) {
        return res.status(400).json({ success: false, message: 'Missing Razorpay signature header.' });
      }

      // 1. Verify Razorpay HMAC-SHA256 signature using raw request body
      const rawBody = req.rawBody ? req.rawBody : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isSignatureValid) {
        console.warn('[Webhook Engine] ⚠️ Razorpay Webhook Invalid Signature!');
        return res.status(400).json({ success: false, message: 'Invalid Webhook Signature.' });
      }

      const event = req.body?.event;
      const payload = req.body?.payload;

      console.log(`[Webhook Engine] 🔔 Received Razorpay Webhook Event: "${event}"`);

      // 2. Process Webhook Event Types
      switch (event) {
        case 'payment.captured':
        case 'order.paid': {
          const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
          const razorpayOrderId = paymentEntity?.order_id || paymentEntity?.id;
          const razorpayPaymentId = paymentEntity?.id;
          const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
          const notes = paymentEntity?.notes || {};

          if (notes.type === 'WALLET_RECHARGE' || notes.userId || notes.walletId) {
            const userId = notes.userId || notes.user_id;
            if (userId && amount > 0) {
              await WalletRepository.creditWallet({
                userId,
                amount,
                paymentId: razorpayPaymentId,
                orderId: razorpayOrderId,
                description: `Razorpay Webhook Verified Add Money (₹${amount})`
              }).catch(() => {});

              sendToUser(userId, 'wallet-updated', { balance: amount, type: 'Recharge' });
              await NotificationService.sendPushNotification(
                userId,
                'Money Added via Webhook ✓',
                `₹${amount} credited to your ZipRide Wallet!`
              ).catch(() => {});
            }
          }

          // Record Audit Log
          AuditService.log({
            action: 'RAZORPAY_WEBHOOK_PAYMENT_CAPTURED',
            performed_by: 'RAZORPAY_WEBHOOK',
            details: { event, razorpayOrderId, razorpayPaymentId, amount }
          });
          break;
        }

        case 'payment.failed': {
          const paymentEntity = payload?.payment?.entity;
          const razorpayPaymentId = paymentEntity?.id;
          const errorReason = paymentEntity?.error_description || 'Payment Failed';

          console.warn(`[Webhook Engine] Payment failed for ${razorpayPaymentId}: ${errorReason}`);
          AuditService.log({
            action: 'RAZORPAY_WEBHOOK_PAYMENT_FAILED',
            performed_by: 'RAZORPAY_WEBHOOK',
            details: { event, razorpayPaymentId, errorReason }
          });
          break;
        }

        case 'refund.processed': {
          const refundEntity = payload?.refund?.entity;
          const refundId = refundEntity?.id;
          const amount = refundEntity?.amount ? refundEntity.amount / 100 : 0;
          const notes = refundEntity?.notes || {};
          const userId = notes.userId || notes.user_id;

          if (userId && amount > 0) {
            await WalletRepository.creditWallet({
              userId,
              amount,
              paymentId: refundId,
              description: `Refund Processed (₹${amount})`
            }).catch(() => {});

            sendToUser(userId, 'wallet-updated', { balance: amount, type: 'Refund' });
            await NotificationService.sendPushNotification(
              userId,
              'Refund Processed ✓',
              `₹${amount} has been refunded to your ZipRide Wallet.`
            ).catch(() => {});
          }

          AuditService.log({
            action: 'RAZORPAY_WEBHOOK_REFUND_PROCESSED',
            performed_by: 'RAZORPAY_WEBHOOK',
            details: { event, refundId, amount }
          });
          break;
        }

        default:
          console.log(`[Webhook Engine] Event ${event} acknowledged.`);
          break;
      }

      return res.status(200).json({ success: true, message: 'Webhook processed successfully.' });
    } catch (err) {
      console.error('[Webhook Engine] Exception:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};

export default WebhookController;
