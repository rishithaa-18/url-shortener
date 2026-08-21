require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');
const redis = require('./src/config/redis');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Hosting platforms (Render, Railway, Fly, etc.) send SIGTERM to ask a
// process to shut down cleanly before killing it outright — on every
// redeploy, not just on a crash. Without handling it, requests in flight
// at that exact moment get dropped mid-response, and the Postgres/Redis
// connections are torn down abruptly rather than closed.
//
// The order matters: stop accepting NEW connections first (server.close),
// then close the things those connections were using (DB pool, Redis) once
// existing requests have finished draining.
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed (no longer accepting new connections)');

    try {
      await pool.end();
      console.log('Postgres pool closed');
    } catch (err) {
      console.error('Error closing Postgres pool:', err.message);
    }

    if (redis) {
      redis.disconnect();
      console.log('Redis connection closed');
    }

    process.exit(0);
  });

  // Safety net: if something hangs during shutdown (a stuck connection,
  // etc.), don't let the process hang forever — force exit after a timeout
  // rather than becoming a zombie process the platform has to kill anyway.
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
