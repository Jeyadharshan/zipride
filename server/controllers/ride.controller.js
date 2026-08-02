import { RideService } from '../services/ride.service.js';

export const RideController = {
  async requestRide(req, res, next) {
    try {
      const ride = await RideService.requestRide(req.user.id, req.body);
      res.status(201).json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getRideDetails(req, res, next) {
    try {
      const ride = await RideService.getRideDetails(req.params.id);
      if (!ride) return res.status(404).json({ error: { message: 'Ride not found.' } });
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getActiveRide(req, res, next) {
    try {
      const ride = await RideService.getActiveRide(req.user.id);
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async cancelRide(req, res, next) {
    try {
      const ride = await RideService.cancelRide(req.params.id);
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async acceptRide(req, res, next) {
    try {
      const ride = await RideService.acceptRide(req.params.id, req.user.id);
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async startRide(req, res, next) {
    try {
      const ride = await RideService.startRide(req.params.id);
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async completeRide(req, res, next) {
    try {
      const ride = await RideService.completeRide(req.params.id);
      res.json({ data: ride });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getRideHistory(req, res, next) {
    try {
      const role = req.query.role || 'rider';
      const history = await RideService.getRideHistory(req.user.id, role);
      res.json({ data: history });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
