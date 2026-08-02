import { AuthService } from '../services/auth.service.js';

export const AuthController = {
  async registerRider(req, res, next) {
    try {
      const { user, token } = await AuthService.registerRider(req.body);
      res.status(201).json({ data: { user, token } });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async registerDriver(req, res, next) {
    try {
      const { user, driver, token } = await AuthService.registerDriver(req.body);
      res.status(201).json({ data: { user, driver, token } });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async login(req, res, next) {
    try {
      const { username, password, role } = req.body;
      const { user, token } = await AuthService.login(username, password, role);
      res.json({ data: { user, token } });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  },

  async me(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: { message: 'Not authenticated' } });
      }
      res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  }
};
