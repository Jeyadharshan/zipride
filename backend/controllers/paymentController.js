import { PaymentService } from '../services/paymentService.js';
import Logger from '../utils/logger.js';

export const PaymentController = {
  async createPaymentOrder(req, res, next) {
    try {
      const rideId = req.body.rideId || req.body.ride_id;
      const amount = req.body.amount;
      const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'Razorpay';

      if (!rideId || amount === undefined || amount === null) {
        return res.status(400).json({ success: false, message: 'rideId and amount are required.' });
      }

      const orderData = await PaymentService.createOrder(rideId, amount, paymentMethod);

      return res.status(200).json({
        success: true,
        message: 'Payment order generated successfully.',
        razorpay_order_id: orderData.razorpay_order_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        key_id: orderData.key_id,
        data: orderData
      });
    } catch (err) {
      Logger.error('[PaymentController.createPaymentOrder Error]:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async verifyPayment(req, res, next) {
    try {
      const razorpay_order_id = req.body.razorpay_order_id || req.body.paymentId;
      const razorpay_payment_id = req.body.razorpay_payment_id || req.body.transactionReference;
      const razorpay_signature = req.body.razorpay_signature;
      const rideId = req.body.rideId || req.body.ride_id;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required for verification.'
        });
      }

      const result = await PaymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        rideId,
      });

      if (!result.success || !result.verified) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: result.message || 'Payment signature verification failed.',
          rideStatus: 'Payment Pending',
          paymentStatus: 'Pending'
        });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Payment verified and ride completed successfully.',
        data: result
      });
    } catch (err) {
      Logger.error('[PaymentController.verifyPayment Error]:', err.message);
      return res.status(500).json({ success: false, verified: false, message: err.message });
    }
  },

  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      if (!signature) {
        return res.status(400).json({ success: false, message: 'Webhook signature missing.' });
      }

      const isValid = await PaymentService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
      }

      const event = req.body.event;
      Logger.payment(`Received Razorpay Webhook Event: ${event}`);

      if (event === 'payment.captured') {
        const entity = req.body.payload.payment.entity;
        const orderId = entity.order_id;
        const paymentReference = entity.id;

        // Perform async completion of payment
        console.log(`[Webhook Captured] Order ${orderId} captured as ${paymentReference}`);
      }

      return res.json({ success: true, message: 'Webhook logged.' });
    } catch (err) {
      Logger.error('[Razorpay Webhook Error]:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getReceipt(req, res, next) {
    try {
      const { ReceiptService } = await import('../services/receiptService.js');
      const rideId = req.params.rideId;
      const receipt = await ReceiptService.getRideReceipt(rideId);

      if (req.query.format === 'html') {
        const html = ReceiptService.generateReceiptHtml(receipt);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      return res.json({
        success: true,
        message: 'Ride receipt generated.',
        data: receipt
      });
    } catch (err) {
      next(err);
    }
  },

  async collectCash(req, res, next) {
    try {
      const rideId = req.body.rideId || req.body.ride_id;
      if (!rideId) {
        return res.status(400).json({ success: false, message: 'rideId is required.' });
      }

      const result = await PaymentService.collectCash(rideId);
      return res.status(200).json(result);
    } catch (err) {
      Logger.error('[PaymentController.collectCash Error]:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};
