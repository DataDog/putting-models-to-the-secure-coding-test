import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  }

  // Never leak stack traces or internal error details to the client.
  const message = statusCode < 500 ? err.message : 'Internal server error';
  res.status(statusCode).json({ error: message });
}
