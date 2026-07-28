export const errorHandler = (err, req, res, next) => {
  console.error('[Express Exception Triggered]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.stack : err.message || 'Internal server issue'
  });
};
export default errorHandler;
