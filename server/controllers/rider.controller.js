import { RiderService } from '../services/rider.service.js';

export const RiderController = {
  async getProfile(req, res, next) {
    try {
      const profile = await RiderService.getProfile(req.user.id);
      res.json({ data: profile });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updated = await RiderService.updateProfile(req.user.id, req.body);
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
