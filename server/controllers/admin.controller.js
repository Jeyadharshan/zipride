import { UserModel } from '../models/user.model.js';
import { DriverModel } from '../models/driver.model.js';
import { AdminModel } from '../models/admin.model.js';
import { RideModel } from '../models/ride.model.js';

export const AdminController = {
  async getUsers(req, res, next) {
    try {
      const users = await UserModel.getAll('rider');
      res.json({ data: users });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getDrivers(req, res, next) {
    try {
      const drivers = await DriverModel.getAll();
      res.json({ data: drivers });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async approveDriver(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await DriverModel.update(id, { verification_status: 'approved' });
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async rejectDriver(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await DriverModel.update(id, { verification_status: 'rejected' });
      res.json({ data: updated });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getSettings(req, res, next) {
    try {
      const settings = await AdminModel.getSettings();
      res.json({ data: settings });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async updateSetting(req, res, next) {
    try {
      const { key, value } = req.body;
      const setting = await AdminModel.updateSetting(key, value);
      res.json({ data: setting });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async getSystemStats(req, res, next) {
    try {
      const riders = await UserModel.getAll('rider');
      const drivers = await DriverModel.getAll();
      const approvedDrivers = drivers.filter(d => d.verification_status === 'approved');
      
      const rides = await RideModel.getAll();
      const completedRides = rides.filter(r => r.status === 'completed');
      const totalRevenue = completedRides.reduce((sum, r) => sum + r.fare, 0);

      res.json({
        data: {
          totalUsers: riders.length,
          activeDrivers: approvedDrivers.length,
          revenue: totalRevenue,
          totalRides: completedRides.length
        }
      });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  }
};
