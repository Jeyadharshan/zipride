export const errorHandler = (err, req, res, next) => {
  console.error('[Global Error Handler] Caught Exception:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message: message,
      status: status,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
};
