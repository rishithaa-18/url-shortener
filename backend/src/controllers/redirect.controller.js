const linksService = require('../services/links.service');
const analyticsService = require('../services/analytics.service');
const cacheService = require('../services/cache.service');

async function redirect(req, res, next) {
  try {
    const { shortCode } = req.params;

    // Fast path: check Redis first. A cache hit skips Postgres entirely.
    // Note we only cache ACTIVE, non-expired links (see setCachedLink), so
    // a hit here means we can trust it without re-checking those fields.
    const cached = await cacheService.getCachedLink(shortCode);
    if (cached) {
      analyticsService.logClick(cached.id, req);
      return res.redirect(302, cached.originalUrl);
    }

    // Cache miss: fall back to the database (this also covers Redis being
    // completely down, since getCachedLink returns null in that case too).
    const link = await linksService.getLinkByShortCode(shortCode);

    if (!link) {
      return res.status(404).json({ error: { code: 'LINK_NOT_FOUND', message: 'This short link does not exist' } });
    }

    if (!link.is_active) {
      return res.status(410).json({ error: { code: 'LINK_DISABLED', message: 'This link has been disabled' } });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: { code: 'LINK_EXPIRED', message: 'This link has expired' } });
    }

    // Populate the cache for next time. Fire-and-forget — a cache write
    // failure shouldn't delay or break this redirect.
    cacheService.setCachedLink(shortCode, { id: link.id, originalUrl: link.original_url }, link.expires_at);

    // Deliberately NOT awaited: the visitor shouldn't wait on an analytics
    // write to reach their destination. Errors are caught inside logClick
    // itself so a failed insert can't crash or hang this request.
    analyticsService.logClick(link.id, req);

    res.redirect(302, link.original_url);
  } catch (err) {
    next(err);
  }
}

module.exports = { redirect };
