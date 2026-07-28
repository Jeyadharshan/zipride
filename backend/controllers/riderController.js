import { UserRepository } from '../repositories/userRepository.js';

export const RiderController = {
  async getProfile(req, res, next) {
    try {
      const profile = await UserRepository.findById(req.user.id);
      return res.json({
        success: true,
        message: 'Profile retrieved.',
        data: profile
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const updated = await UserRepository.updateProfile(req.user.id, updates);
      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async getFavourites(req, res, next) {
    try {
      const list = await UserRepository.getFavourites(req.user.id);
      return res.json({
        success: true,
        message: 'Bookmark list retrieved.',
        data: list
      });
    } catch (err) {
      next(err);
    }
  },

  async addFavourite(req, res, next) {
    try {
      const { label, address, latitude, longitude } = req.body;
      await UserRepository.addFavourite(req.user.id, label, address, latitude, longitude);
      return res.json({
        success: true,
        message: 'Place saved successfully.',
        data: { label, address, latitude, longitude }
      });
    } catch (err) {
      next(err);
    }
  },

  async getRecentPlaces(req, res, next) {
    try {
      const list = await UserRepository.getRecentPlaces(req.user.id);
      return res.json({
        success: true,
        message: 'Recent destinations retrieved.',
        data: list
      });
    } catch (err) {
      next(err);
    }
  }
};
