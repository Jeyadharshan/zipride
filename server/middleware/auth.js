import { verifyToken } from '../config/jwt.js';
import { dbGet } from '../config/database.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Authentication required. No token provided.' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: { message: 'Invalid or expired token.' } });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: { message: 'User account not found.' } });
    }

    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      return res.status(403).json({ error: { message: 'Your account has been suspended or banned.' } });
    }

    // Attach user profile to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err.message);
    res.status(500).json({ error: { message: 'Internal server authentication error.' } });
  }
};
