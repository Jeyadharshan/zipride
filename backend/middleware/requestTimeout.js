// backend/middleware/requestTimeout.js
// Aborts slow requests after a configurable timeout to prevent resource exhaustion.

import { appConfig } from '../config/app.js';

export const requestTimeout = (timeoutMs = appConfig.requestTimeoutMs) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Request timed out. Please try again.',
          data: null,
          errors: [{ code: 'REQUEST_TIMEOUT', message: 'Server took too long to respond.' }],
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
  };
};

export default requestTimeout;
