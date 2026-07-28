import crypto from 'crypto';
import { PaymentModel } from '../models/payment.model.js';
import { RideModel } from '../models/ride.model.js';

export const PaymentService = {
  async createPayment(paymentData) {
    const { rideId, amount, paymentMethod } = paymentData;
    const paymentId = crypto.randomUUID();

    const payment = await PaymentModel.create({
      id: paymentId,
      ride_id: rideId,
      amount: amount,
      status: 'pending',
      payment_method: paymentMethod,
      transaction_reference: null
    });

    return payment;
  },

  async verifyPayment(paymentId, ref) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw new Error('Payment transaction not found.');

    // 1. Mark payment as completed
    await PaymentModel.updateStatus(paymentId, 'completed', ref);

    // 2. Mark ride payment status as completed
    await RideModel.update(payment.ride_id, { payment_status: 'completed' });

    return PaymentModel.findById(paymentId);
  }
};
