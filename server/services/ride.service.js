import crypto from 'crypto';
import { RideModel } from '../models/ride.model.js';
import { DriverModel } from '../models/driver.model.js';
import { WalletModel } from '../models/wallet.model.js';
import { NotificationModel } from '../models/notification.model.js';

export const RideService = {
  async requestRide(userId, requestData) {
    const {
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      rideType,
      paymentMethod
    } = requestData;

    // Standard local fare calculation
    // Economy base=40, per km=12. Sedan base=60, per km=15. SUV base=80, per km=20.
    const baseFares = { ECONOMY: 40, SEDAN: 60, SUV: 80, TAXI: 40 };
    const ratesPerMile = { ECONOMY: 12, SEDAN: 15, SUV: 20, TAXI: 12 };
    
    const typeKey = (rideType || 'ECONOMY').toUpperCase();
    const base = baseFares[typeKey] || 40;
    const rate = ratesPerMile[typeKey] || 12;

    const mockDistance = 5.2; // mock distance in km/miles
    const mockDuration = 900; // 15 mins (in seconds)
    const fare = Math.round((base + mockDistance * rate) * 100) / 100;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit OTP

    const rideId = crypto.randomUUID();

    const newRide = await RideModel.create({
      id: rideId,
      rider_id: userId,
      pickup_address: pickupAddress,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      dropoff_address: dropoffAddress,
      dropoff_latitude: dropoffLat,
      dropoff_longitude: dropoffLng,
      fare,
      distance: mockDistance,
      duration: mockDuration,
      payment_method: paymentMethod,
      payment_status: 'pending',
      status: 'searching',
      otp
    });

    return RideModel.getRideDetails(newRide.id);
  },

  async getRideDetails(rideId) {
    return RideModel.getRideDetails(rideId);
  },

  async getActiveRide(userId) {
    // Check if user is an active rider
    const activeRiderRide = await RideModel.findActiveByRiderId(userId);
    if (activeRiderRide) {
      return RideModel.getRideDetails(activeRiderRide.id);
    }

    // Check if user is an active driver
    const activeDriverRide = await RideModel.findActiveByDriverId(userId);
    if (activeDriverRide) {
      return RideModel.getRideDetails(activeDriverRide.id);
    }

    return null;
  },

  async cancelRide(rideId) {
    await RideModel.update(rideId, { status: 'cancelled' });
    const ride = await RideModel.getRideDetails(rideId);
    
    // Notify rider and driver
    if (ride.rider_id) {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        user_id: ride.rider_id,
        title: 'Ride Cancelled',
        body: `Your ride ${rideId.substring(0, 8)} has been cancelled.`,
        read: 0
      });
    }
    if (ride.driver_id) {
      await NotificationModel.create({
        id: crypto.randomUUID(),
        user_id: ride.driver_id,
        title: 'Ride Cancelled',
        body: `Rider has cancelled the ride ${rideId.substring(0, 8)}.`,
        read: 0
      });
      // Set driver back to online
      await DriverModel.updateStatus(ride.driver_id, 'online');
    }

    return ride;
  },

  async acceptRide(rideId, driverId) {
    // 1. Assign driver and accept ride
    await RideModel.update(rideId, {
      driver_id: driverId,
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });

    // 2. Mark driver as busy
    await DriverModel.updateStatus(driverId, 'busy');

    const ride = await RideModel.getRideDetails(rideId);

    // Notify Rider
    await NotificationModel.create({
      id: crypto.randomUUID(),
      user_id: ride.rider_id,
      title: 'Ride Accepted',
      body: `Driver has accepted your ride request. Driver OTP is ${ride.otp}.`,
      read: 0
    });

    return ride;
  },

  async startRide(rideId) {
    await RideModel.update(rideId, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });

    const ride = await RideModel.getRideDetails(rideId);

    // Notify Rider
    await NotificationModel.create({
      id: crypto.randomUUID(),
      user_id: ride.rider_id,
      title: 'Ride Started',
      body: `Your ride to ${ride.dropoff_address} is in progress.`,
      read: 0
    });

    return ride;
  },

  async completeRide(rideId) {
    const ride = await RideModel.getRideDetails(rideId);
    if (!ride) throw new Error('Ride not found.');

    // 1. Update status
    await RideModel.update(rideId, {
      status: 'completed',
      payment_status: 'completed', // automatic for simpler dev
      completed_at: new Date().toISOString()
    });

    // 2. Set driver back to online
    await DriverModel.updateStatus(ride.driver_id, 'online');

    // 3. Handle Wallet payments if payment method is wallet
    if (ride.payment_method === 'wallet') {
      // Deduct from Rider Wallet
      await WalletModel.addTransaction({
        id: crypto.randomUUID(),
        wallet_id: ride.rider_id,
        amount: -ride.fare,
        type: 'ride_payment',
        description: `Ride payment for trip ${rideId.substring(0, 8)}`
      });

      // Add earnings to Driver Wallet
      // Platform commission 15% (e.g. driver earnings 85%)
      const driverEarnings = Math.round(ride.fare * 0.85 * 100) / 100;
      await WalletModel.addTransaction({
        id: crypto.randomUUID(),
        wallet_id: ride.driver_id,
        amount: driverEarnings,
        type: 'ride_earnings',
        description: `Ride earnings for trip ${rideId.substring(0, 8)}`
      });
    }

    const updatedRide = await RideModel.getRideDetails(rideId);

    // Notify Rider and Driver
    await NotificationModel.create({
      id: crypto.randomUUID(),
      user_id: ride.rider_id,
      title: 'Ride Completed',
      body: `Your ride has completed. Total fare: Rs ${ride.fare}.`,
      read: 0
    });

    await NotificationModel.create({
      id: crypto.randomUUID(),
      user_id: ride.driver_id,
      title: 'Ride Completed',
      body: `You completed trip ${rideId.substring(0, 8)}. Earnings updated.`,
      read: 0
    });

    return updatedRide;
  },

  async getRideHistory(userId, role) {
    return RideModel.getHistory(userId, role);
  }
};
