import { config } from './config.js';
import { app } from './app.js';
import { closePool } from './db.js';
import { logger } from './utils/logger.js';

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'document portal api listening');
});

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

