// backend/services/matchingEngine.js
// Production-grade driver matching engine
// Filters: online, approved, not banned, not busy, GPS active, inside service zone
// Sorts: nearest distance → highest rating → lowest rejection count → lowest workload

import { DriverRepository } from '../repositories/driverRepository.js';
import { getIo } from '../socket/socket.js';
import db from '../config/db.js';

// In-memory map of pending ride assignments: rideId -> { sortedPool, currentIndex, timeoutId }
const pendingAssignments = new Map();

export const MatchingEngine = {

  /**
   * Find sorted pool of eligible drivers near pickup location.
   * Returns an array sorted by optimal score (not just nearest).
   */
  async findSortedDriverPool(pickupLat, pickupLng, vehicleType = 'Car', radiusKm = 10) {
    try {
      console.log(`[Matching Engine] Building driver pool for type "${vehicleType}" around [${pickupLat}, ${pickupLng}]...`);

      // Fetch all nearby online, approved, not-banned drivers within radius
      const nearbyDrivers = await DriverRepository.findNearbyDrivers(pickupLat, pickupLng, radiusKm, vehicleType);

      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        // Fallback: try without vehicle type filter
        const anyDrivers = await DriverRepository.findNearbyDrivers(pickupLat, pickupLng, radiusKm, null);
        if (!anyDrivers || anyDrivers.length === 0) {
          console.log('[Matching Engine] No eligible drivers found in area.');
          return [];
        }
        console.log(`[Matching Engine] No drivers for type "${vehicleType}", falling back to any available (${anyDrivers.length} found).`);
        return MatchingEngine._sortDriverPool(anyDrivers);
      }

      console.log(`[Matching Engine] Found ${nearbyDrivers.length} candidate drivers.`);
      return MatchingEngine._sortDriverPool(nearbyDrivers);
    } catch (err) {
      console.error('[Matching Engine] Pool build failed:', err.message);
      return [];
    }
  },

  /**
   * Score and sort driver pool.
   * Lower score = better match.
   * Formula considers: distance (km), rating, rejection count, active rides (workload)
   */
  _sortDriverPool(drivers) {
    return drivers
      .map(d => {
        const distScore   = (d.distance_km || d.distance || 0) * 3.0;         // distance weight
        const ratingScore = -(d.rating || 3.0) * 2.0;                          // higher rating = lower score
        const rejectScore = (d.cancelled_rides || 0) * 0.5;                    // fewer rejections = lower score
        const workScore   = (d.total_rides || 0) > 0 ? 1 / (d.total_rides) : 0; // lighter workload
        const totalScore  = distScore + ratingScore + rejectScore + workScore;
        return { ...d, _matchScore: totalScore };
      })
      .sort((a, b) => a._matchScore - b._matchScore);
  },

  /**
   * Assign a ride to the best available driver.
   * Sends socket invite. Sets up 30-second timeout for auto-reassign on rejection.
   */
  async assignRide(rideId, pickupLat, pickupLng, vehicleType, rideFare, pickupAddress, dropoffAddress) {
    const pool = await MatchingEngine.findSortedDriverPool(pickupLat, pickupLng, vehicleType);

    if (!pool || pool.length === 0) {
      console.log(`[Matching Engine] No drivers found for ride ${rideId}. Ride stays in Searching.`);
      return null;
    }

    // Store assignment state
    pendingAssignments.set(String(rideId), {
      pool,
      currentIndex: 0,
      rideId,
      pickupLat,
      pickupLng,
      vehicleType,
      rideFare,
      pickupAddress,
      dropoffAddress,
    });

    return MatchingEngine._dispatchToDriver(String(rideId));
  },

  /**
   * Dispatch ride to driver at currentIndex in the pool.
   */
  async _dispatchToDriver(rideId) {
    const state = pendingAssignments.get(rideId);
    if (!state) return null;

    const { pool, currentIndex } = state;
    if (currentIndex >= pool.length) {
      console.log(`[Matching Engine] All ${pool.length} drivers exhausted for ride ${rideId}. Ride remains unassigned.`);
      pendingAssignments.delete(rideId);
      // Notify rider that no driver is available
      const io = getIo();
      if (io) {
        io.emit(`ride:no_driver:${rideId}`, { rideId, message: 'No drivers available at this time.' });
      }
      return null;
    }

    const driver = pool[currentIndex];
    const driverProfileId = driver.profile_id;

    console.log(`[Matching Engine] Dispatching ride ${rideId} to driver ${driverProfileId} (index ${currentIndex}, score: ${driver._matchScore?.toFixed(2)})`);

    const io = getIo();
    if (io) {
      io.emit(`driver:invite:${driverProfileId}`, {
        rideId,
        pickupAddress: state.pickupAddress,
        dropoffAddress: state.dropoffAddress,
        fare: state.rideFare,
        distanceKm: (driver.distance_km || driver.distance || 0).toFixed(2),
        driverEta: Math.round((driver.distance_km || driver.distance || 1) * 3), // rough ETA in minutes
        vehicleType: state.vehicleType,
        timeoutSeconds: 30,
      });
    }

    // 30-second acceptance timeout
    const timeoutId = setTimeout(async () => {
      console.log(`[Matching Engine] Timeout! Driver ${driverProfileId} did not accept ride ${rideId}. Trying next.`);
      const currentState = pendingAssignments.get(rideId);
      if (currentState && currentState.currentIndex === currentIndex) {
        currentState.currentIndex++;

        // Log timeout in audit_logs
        await db.execute(
          `INSERT INTO audit_logs (profile_id, action, table_name, record_id, created_at) VALUES (?, ?, 'rides', ?, NOW())`,
          [driverProfileId, `DRIVER_TIMEOUT_RIDE_${rideId}`, String(rideId)]
        ).catch(() => {});

        // Notify rider of reassignment attempt
        if (io) {
          io.emit(`ride:reassigning:${rideId}`, { rideId, message: 'Looking for another driver...' });
        }

        MatchingEngine._dispatchToDriver(rideId);
      }
    }, 30_000);

    state.timeoutId = timeoutId;
    return driver;
  },

  /**
   * Call this when a driver explicitly rejects a ride.
   * Cancels timeout and immediately moves to next driver.
   */
  async onDriverRejected(rideId, driverProfileId) {
    const state = pendingAssignments.get(String(rideId));
    if (!state) return;

    console.log(`[Matching Engine] Driver ${driverProfileId} rejected ride ${rideId}. Moving to next driver.`);

    // Clear existing timeout
    if (state.timeoutId) clearTimeout(state.timeoutId);
    state.currentIndex++;

    // Log rejection
    await db.execute(
      `INSERT INTO audit_logs (profile_id, action, table_name, record_id, created_at) VALUES (?, ?, 'rides', ?, NOW())`,
      [driverProfileId, `DRIVER_REJECTED_RIDE_${rideId}`, String(rideId)]
    ).catch(() => {});

    MatchingEngine._dispatchToDriver(String(rideId));
  },

  /**
   * Call this when a driver accepts the ride — cleans up assignment state.
   */
  onRideAccepted(rideId) {
    const state = pendingAssignments.get(String(rideId));
    if (state && state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    pendingAssignments.delete(String(rideId));
    console.log(`[Matching Engine] Ride ${rideId} accepted. Assignment state cleared.`);
  },

  /** Legacy single-driver find (backwards compat) */
  async findOptimalDriver(pickupLat, pickupLng, vehicleType = 'Economy') {
    const pool = await MatchingEngine.findSortedDriverPool(pickupLat, pickupLng, vehicleType);
    return pool[0] || null;
  },
};

export default MatchingEngine;
