import { DriverModel } from '../models/driver.model.js';
import { UserModel } from '../models/user.model.js';
import { VehicleModel } from '../models/vehicle.model.js';

export const DriverService = {
  async getProfile(driverId) {
    const user = await UserModel.findById(driverId);
    if (!user) return null;

    const driver = await DriverModel.findById(driverId);
    const vehicle = await VehicleModel.findByDriverId(driverId);

    return {
      ...driver,
      profile: user,
      vehicle: vehicle || null
    };
  },

  async updateProfile(driverId, updates) {
    // Split user profile and driver profile updates
    const userFields = ['full_name', 'email', 'phone', 'avatar_url'];
    const userUpdates = {};
    const driverUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (userFields.includes(key)) {
        userUpdates[key] = updates[key];
      } else {
        driverUpdates[key] = updates[key];
      }
    });

    if (Object.keys(userUpdates).length > 0) {
      await UserModel.update(driverId, userUpdates);
    }

    if (Object.keys(driverUpdates).length > 0) {
      await DriverModel.update(driverId, driverUpdates);
    }

    return this.getProfile(driverId);
  },

  async updateStatus(driverId, status) {
    return DriverModel.updateStatus(driverId, status);
  },

  async updateLocation(driverId, lat, lng, heading = 0) {
    return DriverModel.updateLocation(driverId, lat, lng, heading);
  },

  async getNearbyDrivers(limit = 10) {
    return DriverModel.getNearbyDrivers(limit);
  }
};
