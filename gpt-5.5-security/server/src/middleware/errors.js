import multer from 'multer';
import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: 'File upload failed' });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'Record already exists' });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  req.log?.error({ err: error }, 'request failed');
  return res.status(500).json({ error: 'Internal server error' });
}

