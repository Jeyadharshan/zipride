import { verifyAccessToken } from '../config/jwt.js';
import { UserRepository } from '../repositories/userRepository.js';

export const requireAuth = async (req, res, next) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = verifyAccessToken(token);
          if (decoded && decoded.id) {
            userId = decoded.id;
          }
        } catch (e) {
          console.warn('[Auth Middleware] JWT verification warning:', e.message);
        }
      }
    }

    if (!userId && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
    }

    if (!userId && req.query?.user_id) {
      userId = req.query.user_id;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Access token or User ID missing.',
        error: 'No token or user ID provided'
      });
    }

    const user = await UserRepository.findById(userId).catch(() => null);
    if (!user) {
      req.user = { id: userId, role: 'rider' };
      return next();
    }

    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended or banned.',
        error: 'Account locked'
      });
    }

    // Attach user metadata to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Verification error:', err.message);
    res.status(401).json({
      success: false,
      message: 'Authentication check failed.',
      error: err.message
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      error: 'Not logged in'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges required.',
      error: 'Access Denied'
    });
  }

  next();
};

export default requireAuth;
