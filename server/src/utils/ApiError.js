/**
 * Operational error with an HTTP status attached. Anything thrown that is not an
 * ApiError is treated as a bug: logged loudly, reported as a 500 with no internals.
 */
export default class ApiError extends Error {
  constructor(status, message, { code, errors, expose = true } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || httpCode(status);
    this.errors = errors;
    this.expose = expose;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(msg = 'Bad request', opts) {
    return new ApiError(400, msg, opts);
  }
  static unauthorized(msg = 'Authentication required', opts) {
    return new ApiError(401, msg, opts);
  }
  static forbidden(msg = 'You do not have access to this resource', opts) {
    return new ApiError(403, msg, opts);
  }
  static notFound(msg = 'Resource not found', opts) {
    return new ApiError(404, msg, opts);
  }
  static conflict(msg = 'That conflicts with existing data', opts) {
    return new ApiError(409, msg, opts);
  }
  static unprocessable(msg = 'The submission could not be processed', opts) {
    return new ApiError(422, msg, opts);
  }
  static tooMany(msg = 'Too many requests — please slow down', opts) {
    return new ApiError(429, msg, opts);
  }
  static internal(msg = 'Something went wrong on our side', opts) {
    return new ApiError(500, msg, { expose: false, ...opts });
  }
}

function httpCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'UNAVAILABLE',
    }[status] || 'ERROR'
  );
}
