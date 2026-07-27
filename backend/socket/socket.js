import { Server } from 'socket.io';
import Logger from '../utils/logger.js';
import { handleTrackingEvents } from './tracking.js';

let io = null;
const userSockets = new Map(); // Maps user_id / profile_id -> socket_id
const activeDrivers = new Set(); // Set of active online driver profile IDs
const adminSockets = new Set(); // Set of admin socket IDs

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 60000
  });

  io.on('connection', (socket) => {
    Logger.socket(`Socket connected: ${socket.id}`);

    // Register user session mapping & join role rooms
    socket.on('auth:register', (data) => {
      const { userId, profileId, role } = data;
      const id = userId || profileId;
      if (id) {
        userSockets.set(id, socket.id);
        socket.userId = id;
        socket.role = role;

        // Join room by role
        if (role === 'admin') {
          adminSockets.add(socket.id);
          socket.join('admins');
        } else if (role === 'driver') {
          activeDrivers.add(id);
          socket.join('drivers');
          io.emit('driver:count_update', { count: activeDrivers.size });
          io.to('admins').emit('driver-online', { driverId: id, timestamp: new Date() });
        } else if (role === 'rider') {
          socket.join('riders');
        }

        socket.join(`user_${id}`);
        Logger.socket(`User ${id} (${role}) registered on socket: ${socket.id}`);
      }
    });

    // Handle tracking coordinates and rooms
    handleTrackingEvents(io, socket, userSockets);

    // Heartbeat check
    socket.on('heartbeat', () => {
      socket.emit('heartbeat:ack', { time: Date.now() });
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      Logger.socket(`Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        userSockets.delete(socket.userId);
        if (socket.role === 'driver') {
          activeDrivers.delete(socket.userId);
          io.emit('driver:count_update', { count: activeDrivers.size });
          io.to('admins').emit('driver-offline', { driverId: socket.userId, timestamp: new Date() });
        } else if (socket.role === 'admin') {
          adminSockets.delete(socket.id);
        }
        Logger.socket(`User mapping cleared for: ${socket.userId}`);
      }
    });
  });

  return io;
};

export const getIo = () => io;

export const sendToUser = (userId, eventName, payload) => {
  if (io && userId) {
    const socketId = userSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit(eventName, payload);
    }
    io.to(`user_${userId}`).emit(eventName, payload);
    return true;
  }
  return false;
};

export const broadcastToAdmins = (eventName, payload) => {
  if (io) {
    io.to('admins').emit(eventName, payload);
    return true;
  }
  return false;
};

export const broadcastAll = (eventName, payload) => {
  if (io) {
    io.emit(eventName, payload);
    return true;
  }
  return false;
};

export const getOnlineDriverCount = () => activeDrivers.size;
export default initializeSocket;
