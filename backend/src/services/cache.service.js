const redis = require('../config/redis');

const CACHE_PREFIX = 'shortlink:';
// Default TTL for a cached redirect. Chosen as a balance: long enough to
// meaningfully reduce Postgres load on popular links, short enough that a
// deactivated/deleted link doesn't stay redirectable from cache for too
// long after invalidation (belt-and-suspenders — we also actively
// invalidate on update/delete below).
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function key(shortCode) {
  return `${CACHE_PREFIX}${shortCode}`;
}

// Every function here is wrapped in try/catch and returns a safe fallback
// value on failure. This is the second layer of protection (on top of the
// retry/backoff in redis.js) that guarantees a Redis outage degrades
// performance but never breaks functionality.

async function getCachedLink(shortCode) {
  if (!redis) return null;
  try {
    const raw = await redis.get(key(shortCode));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Redis GET failed, falling back to database:', err.message);
    return null;
  }
}

async function setCachedLink(shortCode, { id, originalUrl }, expiresAt) {
  if (!redis) return;
  try {
    let ttl = DEFAULT_TTL_SECONDS;

    // If the link itself expires sooner than our default TTL, cache it for
    // no longer than that — otherwise a visitor could get redirected from
    // a stale cache entry after the link should have stopped working.
    if (expiresAt) {
      const secondsUntilExpiry = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (secondsUntilExpiry > 0) {
        ttl = Math.min(ttl, secondsUntilExpiry);
      } else {
        return; // already expired, don't cache it at all
      }
    }

    await redis.set(key(shortCode), JSON.stringify({ id, originalUrl }), 'EX', ttl);
  } catch (err) {
    console.error('Redis SET failed (non-fatal):', err.message);
  }
}

// Called whenever a link is deactivated or deleted, so a cached redirect
// can't outlive the link's actual state in Postgres.
async function invalidateCachedUrl(shortCode) {
  if (!redis) return;
  try {
    await redis.del(key(shortCode));
  } catch (err) {
    console.error('Redis DEL failed (non-fatal):', err.message);
  }
}

module.exports = { getCachedLink, setCachedLink, invalidateCachedUrl };
