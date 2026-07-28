// backend/utils/response.js
// Standardised API response helpers - used by ALL controllers

import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Send a successful response
 * @param {object} res - Express response object
 * @param {string} message - Human-readable message
 * @param {*} data - Response payload
 * @param {number} statusCode - HTTP status (default 200)
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
  });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string} message - Human-readable message
 * @param {string} errorCode - Machine-readable error code from ErrorCodes
 * @param {number} statusCode - HTTP status (default 400)
 * @param {Array} errors - Additional validation errors
 */
export const sendError = (res, message, errorCode = ErrorCodes.UNKNOWN_ERROR, statusCode = 400, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: errors.length > 0 ? errors : [{ code: errorCode, message }],
  });
};

/**
 * Send paginated response
 */
export const sendPaginated = (res, message, data, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    errors: null,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  });
};
