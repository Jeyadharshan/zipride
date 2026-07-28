import { UserModel } from '../models/user.model.js';

export const RiderService = {
  async getProfile(userId) {
    return UserModel.findById(userId);
  },

  async updateProfile(userId, updates) {
    return UserModel.update(userId, updates);
  }
};
