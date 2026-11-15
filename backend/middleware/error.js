import { AppError } from '../utilities/AppError.js';

/**
 * Wraps async route handlers so rejected promises reach the error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Central error handler — returns a consistent JSON envelope.
 */
export function errorHandler(err, req, res, _next) {
  // MySQL duplicate-key → most commonly a double booking or duplicate email
  if (err && err.code === 'ER_DUP_ENTRY') {
    const msg = /email/i.test(err.sqlMessage || '')
      ? 'An account with this email already exists.'
      : 'That time slot has just been booked. Please choose another slot.';
    return res.status(409).json({ success: false, code: 'conflict', message: msg });
  }

  const status = err.statusCode || err.status || 500;
  const payload = {
    success: false,
    code: err.code || 'internal_error',
    message:
      status === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error'
  };
  if (err.details) payload.details = err.details;
  if (status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json(payload);
}

/** 404 fallback for unknown routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'not_found',
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export { AppError };
