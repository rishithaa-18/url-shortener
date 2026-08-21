// Redis client setup.
//
// Important design decision: Redis must NEVER be a single point of failure.
// If Redis is down, unreachable, or just not configured, the app should
// keep working — just slightly slower, because every redirect falls back
// to Postgres instead of the cache. It should never mean the app is down.
//
// ioredis gives us `retryStrategy` and 'error' event handling to make this
// possible: we configure a capped retry with backoff, and we swallow
// connection errors instead of letting them crash the process.

const Redis = require('ioredis');

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    // Retry indefinitely with a capped backoff, rather than giving up after
    // a fixed number of attempts. The previous version returned `null`
    // (meaning "stop trying forever") after 5 failed attempts — which meant
    // a brief Redis blip (a few seconds of network hiccup, a provider
    // restart) would permanently disable caching and rate limiting for the
    // rest of the process's lifetime, even after Redis came back. On a host
    // that doesn't restart the app often, that's a real problem: a 10-second
    // outage could mean hours of running with no cache and no rate limiting,
    // silently, until the next deploy.
    //
    // Retrying forever with a capped delay means: temporary outage ->
    // degraded performance (as designed) -> Redis recovers -> caching and
    // rate limiting resume automatically, with no restart needed.
    retryStrategy(times) {
      return Math.min(times * 200, 5000); // 200ms, 400ms, ... capped at 5s, forever
    },
    maxRetriesPerRequest: 1, // don't let a single command hang waiting on retries
    lazyConnect: false,
  });

  redis.on('error', (err) => {
    // Logged once per event, not thrown — callers using the cache wrap
    // their own calls in try/catch as a second layer of safety (see
    // cache.service.js), so this handler mainly exists to stop ioredis
    // from producing an unhandled 'error' event that would crash Node.
    console.error('Redis connection error (app continues without cache):', err.message);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });
} else {
  console.warn('⚠️  REDIS_URL not set — running without caching or rate limiting.');
}

module.exports = redis; // may be null; callers must handle that
