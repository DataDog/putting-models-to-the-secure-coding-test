export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }

  if (err.message === 'Invalid file type') {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}
