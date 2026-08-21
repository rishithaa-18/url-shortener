const pool = require('../config/db');
const { generateShortCode } = require('./shortcode.service');
const cacheService = require('./cache.service');

// Custom aliases are restricted to a safe character set so they work cleanly
// in a URL path and can't be used to smuggle in something like "../admin".
const ALIAS_PATTERN = /^[a-zA-Z0-9-_]{3,30}$/;

// 2048 is the de facto max URL length most browsers and servers agree on
// (there's no hard spec limit, but this is the practical convention). With
// no cap at all, someone could submit a multi-KB string as "the URL" —
// still under express.json()'s 100kb body limit, so it wouldn't even be
// rejected there, just quietly stored and bloating the database on every
// such submission.
const MAX_URL_LENGTH = 2048;

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // machine-readable error code for the frontend
  }
}

function isValidUrl(url) {
  if (url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    // Only allow http/https — this blocks things like javascript: or file: URIs
    // from being stored and later "redirected" to.
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function createLink({ originalUrl, customAlias, expiresAt, userId = null }) {
  if (!originalUrl || typeof originalUrl !== 'string' || !isValidUrl(originalUrl)) {
    throw new AppError(
      `originalUrl must be a valid http(s) URL under ${MAX_URL_LENGTH} characters`,
      400,
      'INVALID_URL'
    );
  }

  if (customAlias !== undefined && customAlias !== null) {
    if (!ALIAS_PATTERN.test(customAlias)) {
      throw new AppError(
        'customAlias must be 3-30 characters: letters, numbers, hyphens, underscores only',
        400,
        'INVALID_ALIAS'
      );
    }
  }

  if (expiresAt !== undefined && expiresAt !== null) {
    const parsedDate = new Date(expiresAt);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError('expiresAt must be a valid ISO date string', 400, 'INVALID_EXPIRY');
    }
    if (parsedDate <= new Date()) {
      throw new AppError('expiresAt must be in the future', 400, 'INVALID_EXPIRY');
    }
  }

  // If a custom alias was requested, that IS the short code. Otherwise, we
  // generate a random one and retry on the rare chance of a collision.
  if (customAlias) {
    const existing = await pool.query('SELECT id FROM links WHERE short_code = $1', [customAlias]);
    if (existing.rows.length > 0) {
      throw new AppError('That custom alias is already taken', 409, 'ALIAS_TAKEN');
    }

    return insertLink({
      originalUrl,
      shortCode: customAlias,
      isCustomAlias: true,
      expiresAt,
      userId,
    });
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    try {
      return await insertLink({
        originalUrl,
        shortCode,
        isCustomAlias: false,
        expiresAt,
        userId,
      });
    } catch (err) {
      // 23505 = Postgres unique_violation. Only retry for that specific case —
      // any other DB error should surface immediately, not be silently retried.
      if (err.code === '23505') continue;
      throw err;
    }
  }

  throw new AppError('Could not generate a unique short code, please try again', 500, 'SHORT_CODE_EXHAUSTED');
}

async function insertLink({ originalUrl, shortCode, isCustomAlias, expiresAt, userId }) {
  const result = await pool.query(
    `INSERT INTO links (user_id, original_url, short_code, is_custom_alias, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, original_url, short_code, is_custom_alias, is_active, expires_at, created_at`,
    [userId, originalUrl, shortCode, isCustomAlias, expiresAt || null]
  );
  return result.rows[0];
}

async function getLinkByShortCode(shortCode) {
  const result = await pool.query(
    `SELECT id, original_url, short_code, is_active, expires_at
     FROM links WHERE short_code = $1`,
    [shortCode]
  );
  return result.rows[0] || null;
}

async function getLinkById(id) {
  const result = await pool.query(
    `SELECT id, user_id, original_url, short_code, is_custom_alias, is_active, expires_at, created_at, updated_at
     FROM links WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listLinks({ userId = null } = {}) {
  // Phase 1 has no auth, so for now this returns all links when userId is null.
  // Once auth lands in Phase 6, this will always be scoped to the requesting user.
  const result = userId
    ? await pool.query(
        `SELECT id, original_url, short_code, is_active, expires_at, created_at
         FROM links WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      )
    : await pool.query(
        `SELECT id, original_url, short_code, is_active, expires_at, created_at
         FROM links ORDER BY created_at DESC`
      );
  return result.rows;
}

async function updateLink(id, { isActive }) {
  const result = await pool.query(
    `UPDATE links SET is_active = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, original_url, short_code, is_active, expires_at, updated_at`,
    [isActive, id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
  }

  // Invalidate any cached redirect for this short code — otherwise a
  // deactivated link could keep redirecting from cache until its TTL expires.
  await cacheService.invalidateCachedUrl(result.rows[0].short_code);

  return result.rows[0];
}

async function deleteLink(id) {
  const result = await pool.query('DELETE FROM links WHERE id = $1 RETURNING id, short_code', [id]);
  if (result.rows.length === 0) {
    throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
  }
  await cacheService.invalidateCachedUrl(result.rows[0].short_code);
}

module.exports = {
  AppError,
  createLink,
  getLinkByShortCode,
  getLinkById,
  listLinks,
  updateLink,
  deleteLink,
};
