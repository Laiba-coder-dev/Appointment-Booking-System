/**
 * AppError — consistent operational error handling.
 * `statusCode` drives the HTTP response; `code` is a machine-readable slug.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'error', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details = null) {
    return new AppError(message, 400, 'bad_request', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'unauthorized');
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(message, 403, 'forbidden');
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'not_found');
  }
  static conflict(message = 'Resource already exists', details = null) {
    return new AppError(message, 409, 'conflict', details);
  }
  static validation(message = 'Validation failed', details = null) {
    return new AppError(message, 422, 'validation_error', details);
  }
  static tooMany(message = 'Too many requests') {
    return new AppError(message, 429, 'too_many_requests');
  }
  static internal(message = 'Internal server error') {
    return new AppError(message, 500, 'internal_error');
  }
}
