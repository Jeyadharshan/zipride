// backend/socket/tracking.js
// Real-time driver location tracking, ride room management, and live status broadcast

import Logger from '../utils/logger.js';
import { DriverRepository } from '../repositories/driverRepository.js';
import { MatchingEngine } from '../services/matchingEngine.js';
import db from '../config/db.js';

// Haversine distance in km
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const handleTrackingEvents = (io, socket, userSockets) => {

  // 1. Join Ride Room for real-time trip streams
  socket.on('ride:join', (data) => {
    const { rideId } = data;
    if (rideId) {
      socket.join(`ride_${rideId}`);
      Logger.socket(`Socket ${socket.id} joined room: ride_${rideId}`);
    }
  });

  // 2. Leave Ride Room
  socket.on('ride:leave', (data) => {
    const { rideId } = data;
    if (rideId) {
      socket.leave(`ride_${rideId}`);
      Logger.socket(`Socket ${socket.id} left room: ride_${rideId}`);
    }
  });

  // 3. Driver Full Location Update
  // Payload: { driverId, latitude, longitude, heading, speed, accuracy, battery, networkType, rideId }
  const handleLocationUpdate = async (data = {}) => {
    const {
      driverId, latitude, longitude,
      heading = 0, speed = 0, accuracy = 0,
      battery = null, networkType = null, rideId = null
    } = data;

    const targetDriverId = driverId || data?.profileId || socket.userId;
    if (!targetDriverId || latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      Logger.warn(`[Socket.IO] Ignored driver location update due to missing ID or coords: targetDriverId=${targetDriverId}, lat=${latitude}, lng=${longitude}`);
      return;
    }

    console.log(`[Socket.IO] Received location_update from driver ${targetDriverId} (${socket.id}): lat=${latitude}, lng=${longitude}`);

    try {
      // Persist to driver_live_location + ride_tracking
      await DriverRepository.updateLocation(
        targetDriverId, latitude, longitude,
        heading, speed, accuracy, battery, networkType, rideId
      );

      // Build broadcast payload
      const locationPayload = {
        driverId,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 0,
        battery,
        networkType,
        updatedAt: new Date().toISOString(),
      };

      if (rideId) {
        // Record path in MongoDB Atlas
        try {
          const { MongoService } = await import('../services/mongoService.js');
          MongoService.appendRidePath(rideId, driverId, latitude, longitude, speed, heading).catch(() => {});
        } catch (_) {}

        // Compute ETA and remaining distance using ride dropoff
        let eta = null;
        let remainingKm = null;
        try {
          const [rideRows] = await db.execute(
            `SELECT rl.drop_lat, rl.drop_lng FROM ride_locations rl WHERE rl.ride_id = ? LIMIT 1`,
            [rideId]
          );
          if (rideRows[0]) {
            remainingKm = haversine(latitude, longitude, rideRows[0].drop_lat, rideRows[0].drop_lng);
            eta = Math.ceil((remainingKm / Math.max(speed || 20, 5)) * 60); // minutes
          }
        } catch (_) {}

        // Broadcast to ride room — rider sees driver moving
        io.to(`ride_${rideId}`).emit('driver:location_changed', {
          ...locationPayload,
          rideId,
          eta,
          remainingKm: remainingKm ? +remainingKm.toFixed(2) : null,
        });

        // Broadcast to general channels
        io.emit(`driver:coords:${driverId}`, locationPayload);
        io.emit('driver-location-update', { ...locationPayload, rideId });
      } else {
        // Driver is online but not on a ride — general broadcast
        io.emit(`driver:coords:${targetDriverId}`, locationPayload);
        io.emit('driver-location-update', locationPayload);
      }
    } catch (err) {
      Logger.error(`[Tracking] Location update failed for driver ${targetDriverId}:`, err.message);
    }
  };

  socket.on('driver:location_update', handleLocationUpdate);
  socket.on('driver:location', handleLocationUpdate);

  // 4. Driver rejects a ride — triggers next-driver assignment
  socket.on('ride:reject', async (data) => {
    const { rideId, driverId } = data;
    if (!rideId || !driverId) return;

    Logger.socket(`Driver ${driverId} rejected ride ${rideId}`);
    await MatchingEngine.onDriverRejected(String(rideId), driverId);

    // Notify rider
    io.emit(`ride:reassigning:${rideId}`, {
      rideId,
      message: 'Driver unavailable. Looking for the next nearest driver...',
    });
  });

  // 5. Driver arrives at pickup — broadcast to rider
  socket.on('driver:arrived', async (data) => {
    const { rideId, driverId } = data;
    if (!rideId) return;

    try {
      await db.execute(
        `UPDATE rides SET ride_status = 'Driver Arrived', arrived_time = NOW(), updated_at = NOW() WHERE id = ?`,
        [rideId]
      );
      await db.execute(
        `INSERT INTO ride_status_history (ride_id, ride_status, updated_by, remarks, created_at) VALUES (?, 'Driver Arrived', 'Driver', 'Driver arrived at pickup', NOW())`,
        [rideId]
      ).catch(() => {});
    } catch (_) {}

    io.to(`ride_${rideId}`).emit('ride:driver_arrived', {
      rideId,
      driverId,
      message: 'Your driver has arrived at the pickup location.',
      timestamp: new Date().toISOString(),
    });
    Logger.socket(`Driver ${driverId} arrived for ride ${rideId}`);
  });

  // 6. Typing/chat status
  socket.on('ride:typing', (data) => {
    const { rideId, isTyping, userRole } = data;
    if (rideId) {
      socket.to(`ride_${rideId}`).emit('ride:typing_status', { isTyping, userRole });
    }
  });

  // 7. Heartbeat
  socket.on('heartbeat', () => {
    socket.emit('heartbeat:ack', { time: Date.now() });
  });
};
