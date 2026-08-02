export const requireDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: { message: 'Authentication required.' } });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: { message: 'Forbidden. Driver status required.' } });
  }

  next();
};
