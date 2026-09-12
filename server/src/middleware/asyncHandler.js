/** Wraps async route handlers so rejected promises reach the error middleware
 *  instead of hanging the request (Express 4 does not await handlers). */
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
