import { PaymentService } from '../services/payment.service.js';

export const PaymentController = {
  async createPayment(req, res, next) {
    try {
      const payment = await PaymentService.createPayment(req.body);
      res.status(201).json({ data: payment });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async verifyPayment(req, res, next) {
    try {
      const { paymentId, transactionReference } = req.body;
      if (!paymentId) {
        return res.status(400).json({ error: { message: 'paymentId is required.' } });
      }
      const payment = await PaymentService.verifyPayment(paymentId, transactionReference);
      res.json({ data: payment });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
