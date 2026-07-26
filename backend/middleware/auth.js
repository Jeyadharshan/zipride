import { verifyAccessToken } from '../config/jwt.js';
import { UserRepository } from '../repositories/userRepository.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Access token missing.',
        error: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token.',
        error: 'Unauthorized'
      });
    }

    const user = await UserRepository.findById(decoded.id).catch(() => null);
    if (!user) {
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role || 'rider' };
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
