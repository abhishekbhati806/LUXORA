import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/** Mongoose error → the closest HTTP status + a message that is safe to show. */
function translate(err) {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ApiError(422, 'Some fields need attention.', { errors });
  }
  if (err.name === 'CastError') {
    if (err.kind === 'ObjectId') return ApiError.notFound('We could not find that record.');
    return ApiError.badRequest(`Invalid value for ${err.path}.`);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || { field: '' })[0];
    return ApiError.conflict(
      field === 'email'
        ? 'An account with that email already exists.'
        : `That ${field} is already taken.`,
      { errors: [{ field, message: 'Already in use.' }] },
    );
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Your session expired.' : 'Invalid session token.');
  }
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON in the request body.');
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiError.badRequest(`Images must be under ${env.uploads.maxMb} MB.`);
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, _next) {
  const mapped = err instanceof ApiError ? err : translate(err);
  const status = mapped ? mapped.status : 500;

  if (status >= 500 && !(mapped?.expose && err instanceof ApiError)) {
    // A deliberately raised 5xx (e.g. 501 not configured) is a product decision, not a bug.
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    ok: false,
    message: mapped
      ? mapped.message
      : env.nodeEnv === 'production'
        ? 'Something went wrong on our side. Please try again.'
        : err.message,
    code: mapped?.code || 'INTERNAL_ERROR',
    ...(mapped?.errors ? { errors: mapped.errors } : {}),
    ...(env.nodeEnv === 'development' && status >= 500 ? { stack: err.stack?.split('\n').slice(0, 4) } : {}),
  };

  if (res.headersSent) return;
  res.status(status).json(body);
}

export function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
  }
  return next();
}
