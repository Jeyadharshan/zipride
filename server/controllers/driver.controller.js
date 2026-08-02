import { DriverService } from '../services/driver.service.js';

export const DriverController = {
  async getProfile(req, res, next) {
    try {
      const driverId = req.params.id || req.user.id;
      const profile = await DriverService.getProfile(driverId);
      res.json({ data: profile });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updated = await DriverService.updateProfile(req.user.id, req.body);
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async goOnline(req, res, next) {
    try {
      const updated = await DriverService.updateStatus(req.user.id, 'online');
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async goOffline(req, res, next) {
    try {
      const updated = await DriverService.updateStatus(req.user.id, 'offline');
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async updateLocation(req, res, next) {
    try {
      const { latitude, longitude, heading } = req.body;
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: { message: 'Latitude and longitude are required.' } });
      }
      const updated = await DriverService.updateLocation(req.user.id, latitude, longitude, heading || 0);
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
