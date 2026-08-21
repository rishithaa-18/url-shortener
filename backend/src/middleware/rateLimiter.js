// Rate limiting strategy: sliding window (via Redis sorted sets)
// -----------------------------------------------------------------
// Two common approaches were considered:
//
// 1. Fixed window counter (INCR + EXPIRE)
//    Simple, but has a boundary-burst problem: a client could send N
//    requests at 0:59 and another N at 1:00 — 2N requests in 2 seconds,
//    even though the limit is "N per minute."
//
// 2. Token bucket
//    Smooths bursts over time and is the standard choice for APIs that
//    want to allow short bursts but enforce a steady average rate. More
//    moving parts to implement correctly (refill rate, bucket state).
//
// 3. Sliding window log (chosen approach)
//    Store a timestamp per request in a Redis sorted set (ZSET), score =
//    timestamp. On each request: drop entries older than the window,
//    count what's left, and reject if over the limit. This gives an
//    accurate "N requests in the last W seconds" guarantee with no
//    boundary-burst issue, and is simple enough to reason about in an
//    interview. The tradeoff is slightly more Redis memory per key than
//    a single counter (one sorted-set entry per request in the window) —
//    a non-issue at this project's scale.
//
// Per-IP, not per-user: there's no auth yet (Phase 1-3), and even once
// auth exists, unauthenticated abuse still needs to be capped by IP.
//
// Fail-open on Redis failure: if Redis is unreachable, we let the request
// through rather than blocking all traffic. Rate limiting is a safety
// net, not the core function of the app — the app should stay usable
// even if the safety net itself is temporarily down.

const redis = require('../config/redis');

function rateLimiter({ windowSeconds, maxRequests, keyPrefix }) {
  return async function rateLimitMiddleware(req, res, next) {
    if (!redis) {
      // No Redis configured at all — skip rate limiting entirely rather
      // than silently allowing unlimited requests to look like a bug.
      return next();
    }

    const identifier = req.ip;
    const key = `ratelimit:${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Remove entries outside the current window, then count what remains,
      // then add this request — all as separate calls (a pipeline would
      // save round-trips, but keeping this readable matters more than
      // shaving a few ms at this scale).
      await redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await redis.zcard(key);

      if (currentCount >= maxRequests) {
        res.set('Retry-After', String(windowSeconds));
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Limit is ${maxRequests} per ${windowSeconds} seconds.`,
          },
        });
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`); // unique member per request
      await redis.expire(key, windowSeconds); // let Redis clean up idle keys automatically

      next();
    } catch (err) {
      console.error('Rate limiter failed open due to Redis error:', err.message);
      next(); // fail open — see comment above
    }
  };
}

module.exports = rateLimiter;
