import crypto from 'crypto';
import dotenv from 'dotenv';
import { getRazorpay } from '../config/razorpay.js';
import { PaymentRepository } from '../repositories/paymentRepository.js';
import { RideRepository } from '../repositories/rideRepository.js';
import { DriverRepository } from '../repositories/driverRepository.js';
import Logger from '../utils/logger.js';

dotenv.config();

export const PaymentService = {
  async createOrder(rideId, amount, paymentMethod = 'Razorpay') {
    if (!rideId || amount === undefined || amount === null || Number(amount) <= 0) {
      throw new Error('Valid Ride ID and positive Amount are required.');
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      throw new Error("Razorpay is not configured.");
    }

    const numericAmount = Number(amount);
    const amountPaise = Math.round(numericAmount * 100);

    // 1. Fetch ride details
    const ride = await RideRepository.findById(rideId);
    if (!ride) {
      throw new Error(`Ride with ID ${rideId} not found.`);
    }

    // Duplicate payment protection
    if (ride.payment_status === 'Paid' || ride.payment_status === 'Success' || ride.payment_status === 'Completed') {
      const existingPayment = await PaymentRepository.findByRideId(rideId);
      return {
        alreadyPaid: true,
        message: 'Ride has already been paid for.',
        razorpay_order_id: existingPayment?.gateway_order_id || null,
        razorpayOrderId: existingPayment?.gateway_order_id || null,
        amount: numericAmount,
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID
      };
    }

    // 2. Create Razorpay order using SDK
    let order;
    try {
      const receiptId = `rcpt_${String(rideId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 18)}_${Date.now() % 10000}`;
      order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          ride_id: String(rideId),
          rider_id: String(ride.rider_id || ''),
          driver_id: String(ride.driver_id || '')
        }
      });
    } catch (err) {
      Logger.error('[Razorpay Order Creation Failed]:', err.message);
      throw new Error(`Razorpay Order creation failed: ${err.message}`);
    }

    // 3. Save initial pending payment record in Database
    const paymentId = await PaymentRepository.createPayment({
      ride_id: rideId,
      amount: numericAmount,
      status: 'Pending',
      payment_method: paymentMethod,
      gateway: 'Razorpay',
      gateway_order_id: order.id,
      response_json: order
    });

    Logger.payment(`Created Razorpay Order ${order.id} for Ride ${rideId} (Amount: ₹${numericAmount})`);

    // Broadcast payment-pending socket event to rider, driver, and admin
    try {
      const { getIo, sendToUser, broadcastToAdmins } = await import('../socket/socket.js');
      const io = getIo();
      const payload = {
        rideId,
        amount: numericAmount,
        paymentMethod,
        paymentStatus: 'Pending',
        razorpay_order_id: order.id
      };
      if (io) {
        io.to(`ride_${rideId}`).emit('payment-pending', payload);
        io.emit('payment-pending', payload);
      }
      if (ride.rider_id) sendToUser(ride.rider_id, 'payment-pending', payload);
      if (ride.driver_id) sendToUser(ride.driver_id, 'payment-pending', payload);
      broadcastToAdmins('payment-pending', payload);
    } catch (e) {}

    return {
      razorpay_order_id: order.id,
      razorpayOrderId: order.id,
      amount: numericAmount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      paymentId,
      order
    };
  },

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, rideId, paymentId }) {
    const orderId = razorpay_order_id || paymentId;
    if (!orderId || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured in server environment.');
    }

    // 1. Calculate HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = generatedSignature === razorpay_signature;

    // Find payment record
    let payment = await PaymentRepository.findByOrderId(orderId);
    if (!payment && rideId) {
      payment = await PaymentRepository.findByRideId(rideId);
    }

    const targetRideId = rideId || payment?.ride_id;
    const ride = targetRideId ? await RideRepository.findById(targetRideId) : null;

    if (!isValid) {
      Logger.error(`[Razorpay Signature Verification Failed] Order: ${orderId}, Payment: ${razorpay_payment_id}`);
      
      if (payment) {
        await PaymentRepository.updatePaymentFailed(payment.id, {
          response_json: { error: 'Invalid Signature', razorpay_payment_id, razorpay_order_id }
        });
      }

      if (targetRideId) {
        // Requirement #8: Payment fails -> Ride Status = Payment Pending, Driver remains Busy, User can retry
        await RideRepository.updateStatus(targetRideId, 'Payment Pending', { payment_status: 'Pending' });
      }

      // Broadcast payment-failed socket event
      try {
        const { getIo, sendToUser, broadcastToAdmins } = await import('../socket/socket.js');
        const io = getIo();
        const payload = {
          rideId: targetRideId,
          paymentStatus: 'Failed',
          message: 'Payment verification failed.'
        };
        if (io) {
          io.to(`ride_${targetRideId}`).emit('payment-failed', payload);
          io.emit('payment-failed', payload);
        }
        if (ride?.rider_id) sendToUser(ride.rider_id, 'payment-failed', payload);
        if (ride?.driver_id) sendToUser(ride.driver_id, 'payment-failed', payload);
        broadcastToAdmins('payment-failed', payload);
      } catch (e) {}

      return {
        success: false,
        verified: false,
        message: 'Invalid payment signature. Payment verification failed.',
        rideStatus: 'Payment Pending',
        paymentStatus: 'Pending'
      };
    }

    // 2. Signature Verified Successfully
    Logger.payment(`✅ Razorpay Payment Signature Verified! Order: ${orderId}, Payment: ${razorpay_payment_id}`);

    // Update payment record in DB
    if (payment) {
      await PaymentRepository.updatePaymentSuccess(payment.id, {
        transaction_id: razorpay_payment_id,
        gateway_order_id: orderId,
        response_json: { razorpay_order_id: orderId, razorpay_payment_id, razorpay_signature, status: 'verified' }
      });
    } else if (targetRideId) {
      await PaymentRepository.createPayment({
        ride_id: targetRideId,
        amount: ride?.final_fare || ride?.estimated_fare || 0,
        status: 'Success',
        payment_method: 'Razorpay',
        gateway: 'Razorpay',
        gateway_order_id: orderId,
        transaction_id: razorpay_payment_id,
        response_json: { razorpay_order_id: orderId, razorpay_payment_id, razorpay_signature }
      });
    }

    // 3. Requirement #7: Verified -> Ride Status = Completed, Payment Status = Paid, Driver Status = Available, User can book another ride
    const paidTime = new Date();
    if (targetRideId) {
      await RideRepository.updateStatus(targetRideId, 'Completed', {
        payment_status: 'Paid',
        completed_time: paidTime
      });

      if (ride?.driver_id) {
        await DriverRepository.releaseDriver(ride.driver_id);
        await DriverRepository.incrementRideStats(ride.driver_id, true, false);
        if (ride.final_fare || ride.estimated_fare) {
          await DriverRepository.updateEarnings(ride.driver_id, Number(ride.final_fare || ride.estimated_fare));
        }
      }
    }

    // Broadcast payment-success socket event to rider, driver, and admin
    try {
      const { getIo, sendToUser, broadcastToAdmins } = await import('../socket/socket.js');
      const io = getIo();
      const payload = {
        rideId: targetRideId,
        amount: ride?.final_fare || ride?.estimated_fare || 0,
        paymentMethod: 'Razorpay',
        payment_status: 'Paid',
        paymentStatus: 'Paid',
        paidAt: paidTime.toISOString(),
        transactionId: razorpay_payment_id
      };
      if (io) {
        io.to(`ride_${targetRideId}`).emit('payment-success', payload);
        io.emit('payment-success', payload);
      }
      if (ride?.rider_id) sendToUser(ride.rider_id, 'payment-success', payload);
      if (ride?.driver_id) sendToUser(ride.driver_id, 'payment-success', payload);
      broadcastToAdmins('payment-success', payload);
    } catch (e) {}

    return {
      success: true,
      verified: true,
      message: 'Payment verified and completed successfully.',
      razorpay_order_id: orderId,
      razorpay_payment_id,
      rideStatus: 'Completed',
      paymentStatus: 'Paid'
    };
  },

  async verifyWebhookSignature(body, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  },

  async collectCash(rideId) {
    const ride = await RideRepository.findById(rideId);
    if (!ride) {
      throw new Error(`Ride ${rideId} not found.`);
    }

    if (ride.payment_status === 'Paid' || ride.payment_status === 'Success' || ride.payment_status === 'Completed') {
      return { success: true, alreadyPaid: true, message: 'Ride payment is already completed.' };
    }

    const amount = Number(ride.final_fare || ride.estimated_fare || ride.fare || 0);

    // 1. Create or update cash payment record
    await PaymentRepository.createPayment({
      ride_id: rideId,
      amount,
      status: 'Success',
      payment_method: 'Cash',
      gateway: 'Cash',
      transaction_id: `CASH_${Date.now()}`,
      response_json: { method: 'Cash', collected_at: new Date() }
    });

    // 2. Update ride payment status
    await RideRepository.updateStatus(rideId, ride.ride_status || ride.status || 'In Progress', {
      payment_status: 'Paid',
      payment_method: 'Cash'
    });

    // 3. Socket.IO Real-time broadcast
    const { getIo, sendToUser, broadcastToAdmins } = await import('../socket/socket.js');
    const io = getIo();
    const payload = {
      rideId,
      amount,
      paymentMethod: 'Cash',
      payment_status: 'Paid',
      paymentStatus: 'Paid',
      paidAt: new Date().toISOString()
    };

    if (io) {
      io.to(`ride_${rideId}`).emit('payment-success', payload);
      io.emit('payment-success', payload);
    }

    if (ride.rider_id) {
      sendToUser(ride.rider_id, 'payment-success', payload);
      const { NotificationService } = await import('./notificationService.js');
      await NotificationService.sendPushNotification(
        ride.rider_id,
        'Cash Payment Received ✓',
        `Driver has confirmed cash collection of ₹${amount} for your ride.`
      ).catch(() => {});
    }

    broadcastToAdmins('payment-success', payload);

    return {
      success: true,
      message: 'Cash payment collected and verified successfully.',
      data: payload
    };
  }
};

export default PaymentService;
