// backend/repositories/mongoRepository.js
// MongoDB repository for audit logs, ride tracking history, and notifications.
// All writes are non-blocking (fire-and-forget) — MySQL is the source of truth.

import { getMongoDB } from '../config/mongodb.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCollection(name) {
  const db = getMongoDB();
  if (!db) return null;
  return db.collection(name);
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────
// Collection: audit_logs
// Records login, logout, registration, ride events for analytics & security.

export async function logAuditEvent({ eventType, userId, role, details = {}, ipAddress = null }) {
  try {
    const col = getCollection('audit_logs');
    if (!col) return;
    await col.insertOne({
      event_type: eventType,
      user_id: userId || null,
      role: role || null,
      details,
      ip_address: ipAddress,
      created_at: new Date(),
    });
  } catch (err) {
    console.warn('[MongoDB] audit log write failed:', err.message);
  }
}

export async function getAuditLogs({ userId, eventType, limit = 100, skip = 0 } = {}) {
  try {
    const col = getCollection('audit_logs');
    if (!col) return [];
    const filter = {};
    if (userId) filter.user_id = userId;
    if (eventType) filter.event_type = eventType;
    return await col.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
  } catch (err) {
    console.warn('[MongoDB] audit log read failed:', err.message);
    return [];
  }
}

// ─── Ride Tracking History ────────────────────────────────────────────────────
// Collection: ride_tracking_history
// Stores high-frequency GPS location updates during an active ride.
// Supports geospatial queries (2dsphere index).

export async function logRideLocation({ rideId, driverId, latitude, longitude, speed = null, heading = null }) {
  try {
    const col = getCollection('ride_tracking_history');
    if (!col) return;
    await col.insertOne({
      ride_id: String(rideId),
      driver_id: String(driverId),
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON: [lng, lat]
      },
      speed,
      heading,
      recorded_at: new Date(),
    });
  } catch (err) {
    console.warn('[MongoDB] ride tracking write failed:', err.message);
  }
}

export async function getRideTrackingHistory(rideId, limit = 200) {
  try {
    const col = getCollection('ride_tracking_history');
    if (!col) return [];
    return await col.find({ ride_id: String(rideId) })
      .sort({ recorded_at: 1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn('[MongoDB] ride tracking read failed:', err.message);
    return [];
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
// Collection: notifications
// Push notification queue for riders and drivers.

export async function createNotification({ userId, role, type, title, body, data = {} }) {
  try {
    const col = getCollection('notifications');
    if (!col) return null;
    const result = await col.insertOne({
      user_id: String(userId),
      role,
      type,  // e.g. 'ride_accepted', 'driver_arrived', 'payment_done'
      title,
      body,
      data,
      read: false,
      created_at: new Date(),
    });
    return result.insertedId;
  } catch (err) {
    console.warn('[MongoDB] notification write failed:', err.message);
    return null;
  }
}

export async function getUnreadNotifications(userId, limit = 50) {
  try {
    const col = getCollection('notifications');
    if (!col) return [];
    return await col.find({ user_id: String(userId), read: false })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn('[MongoDB] notification read failed:', err.message);
    return [];
  }
}

export async function markNotificationsRead(userId) {
  try {
    const col = getCollection('notifications');
    if (!col) return;
    await col.updateMany({ user_id: String(userId), read: false }, { $set: { read: true } });
  } catch (err) {
    console.warn('[MongoDB] notification update failed:', err.message);
  }
}

// ─── Ensure Indexes ───────────────────────────────────────────────────────────
// Call once at startup to create MongoDB indexes.

export async function ensureMongoIndexes() {
  try {
    const mdb = getMongoDB();
    if (!mdb) return;

    await mdb.collection('audit_logs').createIndex({ created_at: -1 });
    await mdb.collection('audit_logs').createIndex({ user_id: 1 });
    await mdb.collection('audit_logs').createIndex({ event_type: 1 });

    await mdb.collection('ride_tracking_history').createIndex({ ride_id: 1 });
    await mdb.collection('ride_tracking_history').createIndex({ recorded_at: 1 });
    await mdb.collection('ride_tracking_history').createIndex({ location: '2dsphere' });

    await mdb.collection('notifications').createIndex({ user_id: 1, read: 1 });
    await mdb.collection('notifications').createIndex({ created_at: -1 });

    console.log('[MongoDB] Indexes created successfully.');
  } catch (err) {
    console.warn('[MongoDB] Index creation failed:', err.message);
  }
}
