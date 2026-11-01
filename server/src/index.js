/**
 * ============================================================================
 * MicroLedger API Server Entrypoint
 * ============================================================================
 *
 * PURPOSE:
 * Initializes the Node.js HTTP server instance, mounts the Express application,
 * binds to the configured network PORT, and registers graceful termination
 * signal handlers (SIGINT, SIGTERM) to release connection pools cleanly.
 */

import { createServer } from 'node:http';
import { app } from './app.js';
import { config } from './config/env.js';

const server = createServer(app);
server.listen(config.PORT, () => {
  process.stdout.write(`MicroLedger API listening on port ${config.PORT}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close((error) => {
      if (error) {
        process.stderr.write('Failed to close the HTTP server cleanly.\n');
        process.exitCode = 1;
      }
    });
  });
}
