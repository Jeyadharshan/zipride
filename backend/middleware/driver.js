import db from '../config/db.js';

export const requireDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      error: 'Not logged in'
    });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Driver permissions required.',
      error: 'Access Denied'
    });
  }

  next();
};

export const requireVerifiedDriver = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      error: 'Not logged in'
    });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Driver permissions required.',
      error: 'Access Denied'
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT verification_status FROM driver_profiles WHERE profile_id = ? LIMIT 1`,
      [req.user.id]
    );

    const status = (rows[0]?.verification_status || 'Pending').toLowerCase();
    if (status !== 'verified' && status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Driver verification required. Your account must be verified by an administrator before you can go online or perform ride actions.',
        error: 'DRIVER_NOT_VERIFIED',
        verification_status: rows[0]?.verification_status || 'Pending'
      });
    }

    next();
  } catch (err) {
    console.error('[requireVerifiedDriver] Verification check failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to verify driver status.' });
  }
};

export default requireDriver;
