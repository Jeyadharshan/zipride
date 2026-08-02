// backend/controllers/rideController.js
// Production ride lifecycle controller — full enterprise workflow

import { RideRepository } from '../repositories/rideRepository.js';
import { DriverRepository } from '../repositories/driverRepository.js';
import { GeoapifyService } from '../services/geoapifyService.js';
import { FareEngine } from '../services/fareEngine.js';
import { MatchingEngine } from '../services/matchingEngine.js';
import { WalletService } from '../services/walletService.js';
import { NotificationService } from '../services/notificationService.js';
import { AuditService } from '../services/auditService.js';
import { getIo } from '../socket/socket.js';
import { generateOtp } from '../utils/otp.js';
import { generateInvoiceNumber } from '../utils/helpers.js';
import { EmailService } from '../services/emailService.js';
import db from '../config/db.js';
import crypto from 'crypto';
import { logAuditEvent, logRideLocation, createNotification } from '../repositories/mongoRepository.js';

export const RideController = {

  async requestRide(req, res, next) {
    try {
      const {
        pickupAddress, pickupLatitude, pickupLongitude,
        dropoffAddress, dropoffLatitude, dropoffLongitude,
        paymentMethod, vehicleType, promoCode
      } = req.body;

      const riderId = req.user.id;

      // Block if rider already has an active ride
      const existingRide = await RideRepository.getActiveRideForRider(riderId);
      if (existingRide) {
        return res.status(400).json({ success: false, message: 'You already have an active ride. Complete or cancel it first.' });
      }

      // 1. Calculate routing details
      let route = { distance: 5, duration: 15 };
      try {
        const origin = { lat: pickupLatitude, lng: pickupLongitude };
        const dest   = { lat: dropoffLatitude,  lng: dropoffLongitude };
        route = await GeoapifyService.getRoute(origin, dest);
      } catch (_) { /* use defaults */ }

      // 2. Apply promo code discount if provided
      let couponDiscount = 0;
      let promoId = null;
      if (promoCode) {
        const [promoRows] = await db.execute(
          `SELECT * FROM promo_codes WHERE promo_code = ? AND is_active = 1 AND (expiry_date IS NULL OR expiry_date >= CURDATE()) AND (usage_limit IS NULL OR used_count < usage_limit) LIMIT 1`,
          [promoCode]
        );
        const promo = promoRows[0];
        if (promo) {
          promoId = promo.id;
          if (promo.discount_type === 'Percentage') {
            couponDiscount = Math.min(
              (route.distance * 12 * promo.discount_value) / 100,
              promo.maximum_discount || Infinity
            );
          } else {
            couponDiscount = promo.discount_value;
          }
        }
      }

      // 3. Compute pricing
      const fareCalc = await FareEngine.calculateFare(route.distance, route.duration, { vehicleType, couponDiscount });

      // 4. Generate Ride Code + OTP
      const rideCode = `ZR-${Math.floor(100000 + Math.random() * 900000)}`;
      const otpCode  = generateOtp(4);

      // 5. Save ride record
      const rideId = await RideRepository.create({
        ride_code:          rideCode,
        rider_id:           riderId,
        ride_type:          vehicleType || 'Car',
        payment_method:     paymentMethod || 'Cash',
        pickup_address:     pickupAddress,
        pickup_latitude:    pickupLatitude,
        pickup_longitude:   pickupLongitude,
        dropoff_address:    dropoffAddress,
        dropoff_latitude:   dropoffLatitude,
        dropoff_longitude:  dropoffLongitude,
        estimated_distance: route.distance,
        estimated_duration: route.duration,
        estimated_fare:     fareCalc.finalFare,
      });

      // 6. Set OTP
      await RideRepository.setOtp(rideId, otpCode);

      // 7. Mark promo as used
      if (promoId) {
        await db.execute(`UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?`, [promoId]).catch(() => {});
      }

      // 8. Audit log & MongoDB dual-write
      await AuditService.logAction({
        profileId: riderId,
        action: 'RIDE_REQUESTED',
        tableName: 'rides',
        recordId: String(rideId),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
      logAuditEvent({ eventType: 'RIDE_REQUESTED', userId: riderId, role: 'rider', details: { rideId, rideCode, fare: fareCalc.finalFare }, ipAddress: req.ip });
      createNotification({ userId: riderId, role: 'rider', type: 'ride_requested', title: 'Ride Requested', body: `Your ride ${rideCode} has been requested. Searching for nearby drivers...`, data: { rideId } });

      // 9. Notify rider via socket
      const io = getIo();
      if (io) {
        io.emit(`rider:ride_created:${riderId}`, { rideId, rideCode, otp: otpCode, fare: fareCalc.finalFare });
      }

      // 10. Run matching engine asynchronously
      setTimeout(async () => {
        try {
          await MatchingEngine.assignRide(
            rideId, pickupLatitude, pickupLongitude, vehicleType || 'Car',
            fareCalc.finalFare, pickupAddress, dropoffAddress
          );
        } catch (err) {
          console.error('[Ride Request — Matching Error]:', err.message);
        }
      }, 500);

      const rideData = await RideRepository.findById(rideId);
      return res.status(201).json({
        success: true,
        message: 'Ride request initialized. Searching for nearby drivers...',
        data: { ...rideData, otp: otpCode, estimatedFare: fareCalc }
      });
    } catch (err) {
      next(err);
    }
  },

  async getActiveRide(req, res, next) {
    try {
      const activeRide = await RideRepository.getActiveRideForRider(req.user.id);
      if (!activeRide) {
        return res.json({ success: true, message: 'No active ride.', data: null });
      }
      const rideDetails = await RideRepository.findById(activeRide.id);
      return res.json({ success: true, message: 'Active ride retrieved.', data: rideDetails });
    } catch (err) {
      next(err);
    }
  },

  async getRide(req, res, next) {
    try {
      const ride = await RideRepository.findById(req.params.id);
      if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
      return res.json({ success: true, message: 'Ride details retrieved.', data: ride });
    } catch (err) {
      next(err);
    }
  },

  async acceptRide(req, res, next) {
    try {
      const rideId   = req.params.id;
      const driverId = req.user.id; // profile_id UUID

      const ride = await RideRepository.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
      if (!['Searching', 'Driver Assigned'].includes(ride.ride_status)) {
        return res.status(400).json({ success: false, message: 'Ride already accepted by another driver.' });
      }

      // Get driver_profiles record
      const [dpRows] = await db.execute(`SELECT id FROM driver_profiles WHERE profile_id = ? LIMIT 1`, [driverId]);
      if (!dpRows[0]) return res.status(400).json({ success: false, message: 'Driver profile not found.' });
      const driverIntId = dpRows[0].id;

      // Get driver's active vehicle
      const [vRows] = await db.execute(`SELECT id FROM vehicles WHERE driver_id = ? AND is_active = 1 LIMIT 1`, [driverIntId]);
      const vehicleId = vRows[0]?.id || null;

      // Assign driver to ride
      await RideRepository.assignDriver(rideId, driverIntId, vehicleId);

      // Clear pending assignment state
      MatchingEngine.onRideAccepted(rideId);

      // Broadcast to ride room
      const io = getIo();
      if (io) {
        const driverInfo = await DriverRepository.findById(driverId);
        io.to(`ride_${rideId}`).emit('ride:accepted', {
          rideId,
          status: 'Driver Accepted',
          driver: {
            name:         driverInfo?.full_name,
            phone:        driverInfo?.phone,
            photo:        driverInfo?.profile_image,
            rating:       driverInfo?.rating,
            vehicleNumber: driverInfo?.vehicle_number,
            vehicleBrand:  driverInfo?.vehicle_brand,
            vehicleModel:  driverInfo?.vehicle_model,
            vehicleColor:  driverInfo?.vehicle_color,
          },
        });
      }

      // Notify rider via push
      await NotificationService.sendRideNotification(ride.rider_id, rideId, 'accepted').catch(() => {});

      // Audit log & MongoDB dual-write
      await AuditService.logAction({
        profileId: driverId,
        action: 'RIDE_ACCEPTED',
        tableName: 'rides',
        recordId: String(rideId),
        ipAddress: req.ip,
      }).catch(() => {});
      logAuditEvent({ eventType: 'RIDE_ACCEPTED', userId: driverId, role: 'driver', details: { rideId }, ipAddress: req.ip });
      createNotification({ userId: ride.rider_id, role: 'rider', type: 'ride_accepted', title: 'Driver Assigned', body: 'A driver has accepted your ride and is heading your way.', data: { rideId } });

      return res.json({ success: true, message: 'Ride accepted.', data: await RideRepository.findById(rideId) });
    } catch (err) {
      next(err);
    }
  },

  async startRide(req, res, next) {
    try {
      const rideId = req.params.id;
      const { otp }  = req.body;

      const ride = await RideRepository.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });

      // Verify OTP
      const otpValid = await RideRepository.verifyOtp(rideId, otp);
      if (!otpValid) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
      }

      await RideRepository.updateStatus(rideId, 'Ride Started');

      const io = getIo();
      if (io) {
        io.to(`ride_${rideId}`).emit('ride:started', { rideId, status: 'Ride Started', startedAt: new Date().toISOString() });
      }

      await NotificationService.sendRideNotification(ride.rider_id, rideId, 'in_progress').catch(() => {});
      logAuditEvent({ eventType: 'RIDE_STARTED', userId: req.user?.id || ride.driver_id, role: 'driver', details: { rideId }, ipAddress: req.ip });
      createNotification({ userId: ride.rider_id, role: 'rider', type: 'ride_started', title: 'Ride Started', body: 'Your ride has officially started. Have a safe journey!', data: { rideId } });

      return res.json({ success: true, message: 'Ride started.', data: await RideRepository.findById(rideId) });
    } catch (err) {
      next(err);
    }
  },

  async completeRide(req, res, next) {
    let conn;
    try {
      const rideId = req.params.id;
      const ride   = await RideRepository.findById(rideId);

      if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
      if (ride.ride_status === 'Ride Completed') {
        return res.json({ success: true, message: 'Ride already completed.', data: ride });
      }

      const fare       = parseFloat(ride.estimated_fare || 0);
      const commission = Math.round(fare * 0.15 * 100) / 100;
      const driverEarn = Math.round((fare - commission) * 100) / 100;

      conn = await db.getConnection();
      await conn.beginTransaction();

      // 1. Mark ride as completed
      await conn.execute(
        `UPDATE rides SET ride_status = 'Ride Completed', final_fare = ?, payment_status = ?, completed_time = NOW(), updated_at = NOW() WHERE id = ?`,
        [fare, ride.payment_method === 'Cash' ? 'Pending' : 'Paid', rideId]
      );
      await conn.execute(
        `INSERT INTO ride_status_history (ride_id, ride_status, updated_by, remarks, created_at) VALUES (?, 'Ride Completed', 'System', 'Ride completed', NOW())`,
        [rideId]
      );

      // 2. Wallet operations for non-cash payments
      if (ride.payment_method !== 'Cash') {
        // Verify rider wallet balance
        const [[riderWallet]] = await conn.execute(
          `SELECT id, wallet_balance FROM wallets WHERE profile_id = ?`, [ride.rider_id]
        );
        if (!riderWallet || parseFloat(riderWallet.wallet_balance) < fare) {
          throw new Error('Insufficient wallet balance.');
        }

        // Debit rider
        await conn.execute(
          `UPDATE wallets SET wallet_balance = wallet_balance - ?, updated_at = NOW() WHERE id = ?`,
          [fare, riderWallet.id]
        );
        await conn.execute(
          `INSERT INTO wallet_transactions (wallet_id, ride_id, transaction_type, amount, description, transaction_date) VALUES (?, ?, 'Debit', ?, ?, NOW())`,
          [riderWallet.id, rideId, fare, `Ride fare: ${ride.ride_code}`]
        );

        // Credit driver
        const [[driverWallet]] = await conn.execute(
          `SELECT id FROM wallets WHERE profile_id = ?`, [ride.rider_id] // placeholder
        );
        // Get driver profile_id from driver_id (int)
        const [[dpRow]] = await conn.execute(`SELECT profile_id FROM driver_profiles WHERE id = ?`, [ride.driver_id]);
        if (dpRow) {
          const [[dWallet]] = await conn.execute(`SELECT id FROM wallets WHERE profile_id = ?`, [dpRow.profile_id]);
          if (dWallet) {
            await conn.execute(
              `UPDATE wallets SET wallet_balance = wallet_balance + ?, updated_at = NOW() WHERE id = ?`,
              [driverEarn, dWallet.id]
            );
            await conn.execute(
              `INSERT INTO wallet_transactions (wallet_id, ride_id, transaction_type, amount, description, transaction_date) VALUES (?, ?, 'Credit', ?, ?, NOW())`,
              [dWallet.id, rideId, driverEarn, `Earnings: ${ride.ride_code}`]
            );
          }
        }
      }

      // 3. Record driver earnings
      await conn.execute(
        `INSERT INTO driver_earnings (driver_id, ride_id, fare_amount, commission, driver_amount, earning_date) VALUES (?, ?, ?, ?, ?, NOW())`,
        [ride.driver_id, rideId, fare, commission, driverEarn]
      );

      // 4. Update driver profile totals
      await conn.execute(
        `UPDATE driver_profiles SET total_rides = total_rides + 1, completed_rides = completed_rides + 1, total_earnings = total_earnings + ? WHERE id = ?`,
        [driverEarn, ride.driver_id]
      );

      // 5. Platform commission record
      await conn.execute(
        `INSERT INTO company_earnings (ride_id, amount, created_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE amount = ?`,
        [rideId, commission, commission]
      ).catch(() => {}); // non-blocking if table structure differs

      // 6. Create invoice
      const invoiceNumber = generateInvoiceNumber();
      const tax           = Math.round(fare * 0.05 * 100) / 100;
      const [invResult]   = await conn.execute(
        `INSERT INTO invoices (invoice_number, ride_id, invoice_amount, tax_amount, total_amount, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
        [invoiceNumber, rideId, fare, tax, fare + tax]
      );

      // 7. Create payment record
      const [payResult] = await conn.execute(
        `INSERT INTO payments (ride_id, payer_id, amount, payment_method, payment_status, payment_time) VALUES (?, ?, ?, ?, 'Success', NOW())`,
        [rideId, ride.rider_id, fare, ride.payment_method]
      ).catch(() => [{ insertId: null }]);

      await conn.commit();
      conn.release();

      // 8. Socket broadcast
      const io = getIo();
      if (io) {
        io.to(`ride_${rideId}`).emit('ride:completed', {
          rideId,
          status:     'Ride Completed',
          fare,
          commission,
          driverEarnings: driverEarn,
          invoiceNumber,
          completedAt: new Date().toISOString(),
        });
      }

      // 9. Notifications + email
      await NotificationService.sendRideNotification(ride.rider_id, rideId, 'completed').catch(() => {});

      // 10. Audit log
      await AuditService.logAction({
        profileId: req.user.id,
        action: 'RIDE_COMPLETED',
        tableName: 'rides',
        recordId: String(rideId),
        ipAddress: req.ip,
      }).catch(() => {});

      return res.json({
        success: true,
        message: 'Ride completed successfully.',
        data: {
          ride: await RideRepository.findById(rideId),
          fare,
          commission,
          driverEarnings: driverEarn,
          invoiceNumber,
        }
      });
    } catch (err) {
      if (conn) {
        await conn.rollback().catch(() => {});
        conn.release();
      }
      next(err);
    }
  },

  async cancelRide(req, res, next) {
    let conn;
    try {
      const rideId      = req.params.id;
      const cancelledBy = req.user.role === 'admin' ? 'Admin' : (req.user.role === 'driver' ? 'Driver' : 'Rider');
      const reason      = req.body.reason || 'Cancelled by user';

      const ride = await RideRepository.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' });
      if (['Ride Completed', 'Cancelled'].includes(ride.ride_status)) {
        return res.status(400).json({ success: false, message: 'Ride already finalized.' });
      }

      // Cancellation fee logic — charge rider if driver already assigned
      const driverAssigned = ['Driver Assigned', 'Driver Accepted', 'Driver Arrived'].includes(ride.ride_status);
      const [feeRow] = await db.execute(`SELECT setting_value FROM app_settings WHERE setting_key = 'cancellation_fee_rider' LIMIT 1`);
      const cancelFee = driverAssigned && cancelledBy === 'Rider'
        ? parseFloat(feeRow?.[0]?.setting_value || 20)
        : 0;
      const refundAmount = 0; // Extend with actual refund logic

      conn = await db.getConnection();
      await conn.beginTransaction();

      // Update ride status
      await conn.execute(
        `UPDATE rides SET ride_status = 'Cancelled', cancellation_reason = ?, cancelled_time = NOW(), updated_at = NOW() WHERE id = ?`,
        [reason, rideId]
      );

      // Store in ride_cancellations
      await conn.execute(
        `INSERT INTO ride_cancellations (ride_id, cancelled_by, reason, cancellation_fee, cancelled_at) VALUES (?, ?, ?, ?, NOW())`,
        [rideId, cancelledBy, reason, cancelFee]
      );

      // Deduct cancellation fee from rider's wallet if applicable
      if (cancelFee > 0) {
        const [[rWallet]] = await conn.execute(`SELECT id FROM wallets WHERE profile_id = ?`, [ride.rider_id]);
        if (rWallet) {
          await conn.execute(
            `UPDATE wallets SET wallet_balance = GREATEST(0, wallet_balance - ?), updated_at = NOW() WHERE id = ?`,
            [cancelFee, rWallet.id]
          );
          await conn.execute(
            `INSERT INTO wallet_transactions (wallet_id, ride_id, transaction_type, amount, description, transaction_date) VALUES (?, ?, 'Debit', ?, ?, NOW())`,
            [rWallet.id, rideId, cancelFee, `Cancellation fee: ${ride.ride_code}`]
          );
        }
      }

      // Status history
      await conn.execute(
        `INSERT INTO ride_status_history (ride_id, ride_status, updated_by, remarks, created_at) VALUES (?, 'Cancelled', ?, ?, NOW())`,
        [rideId, cancelledBy, reason]
      );

      await conn.commit();
      conn.release();

      // Cancel matching engine assignment if still pending
      MatchingEngine.onRideAccepted(rideId); // clears timeout

      // Broadcast
      const io = getIo();
      if (io) {
        io.to(`ride_${rideId}`).emit('ride:cancelled', { rideId, cancelledBy, reason, cancellationFee: cancelFee });
      }

      // Notify
      await NotificationService.sendRideNotification(ride.rider_id, rideId, 'cancelled').catch(() => {});

      // Audit log
      await AuditService.logAction({
        profileId: req.user.id,
        action: `RIDE_CANCELLED_BY_${cancelledBy.toUpperCase()}`,
        tableName: 'rides',
        recordId: String(rideId),
        ipAddress: req.ip,
        notes: reason,
      }).catch(() => {});

      return res.json({
        success: true,
        message: 'Ride cancelled.',
        data: { rideId, cancelledBy, reason, cancellationFee: cancelFee, refundAmount }
      });
    } catch (err) {
      if (conn) {
        await conn.rollback().catch(() => {});
        conn.release();
      }
      next(err);
    }
  },

  async getRiderHistory(req, res, next) {
    try {
      const riderId = req.user.id;
      const limit   = parseInt(req.query.limit) || 10;
      const offset  = parseInt(req.query.offset) || 0;
      const status  = req.query.status || null;

      const [rides, total] = await Promise.all([
        RideRepository.getRidesByRider(riderId, { limit, offset, status }),
        RideRepository.countRidesByRider(riderId, status),
      ]);

      return res.json({ success: true, message: 'Ride history retrieved.', data: rides, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },
};
