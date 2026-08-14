import { app } from './app.js';
import { config } from './config.js';

// Last-resort safety net: some errors (e.g. certain low-level DB connection
// failures) surface as an unhandled EventEmitter 'error' or promise
// rejection outside any request's try/catch and outside app.js's
// errorHandler. Node's default behavior for those is to crash immediately
// with a raw stack dump. Logging and exiting deliberately is the same
// outcome for availability (the process still needs to be restarted by the
// hosting platform/orchestrator) but leaves a clear, structured log instead
// of a native crash trace.
process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection, shutting down:', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception, shutting down:', err);
  process.exit(1);
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`document-portal API listening on port ${config.port} (${config.nodeEnv})`);
});
