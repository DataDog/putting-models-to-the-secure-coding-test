// Centralized error handler. Never leak stack traces or internal error
// messages to clients — log them server-side and return a generic message.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = status < 500 ? err.message : 'Internal server error';
  return res.status(status).json({ error: message });
}

export function notFoundHandler(_req, res) {
  return res.status(404).json({ error: 'Not found' });
}
