const pool = require('../config/db');
const { lookupGeo, getClientIp } = require('./geo.service');
const { parseUserAgent } = require('./useragent.service');

// Fire-and-forget click logging.
// Called from the redirect controller WITHOUT being awaited — a visitor
// should never wait on an analytics INSERT to reach their destination.
// We still catch/log errors here so a failed insert doesn't produce an
// unhandled promise rejection.
async function logClick(linkId, req) {
  try {
    const ip = getClientIp(req);
    const { country, region, city } = lookupGeo(ip);
    const { deviceType, browser, os } = parseUserAgent(req.get('user-agent'));
    const referrer = req.get('referer') || null;

    await pool.query(
      `INSERT INTO clicks (link_id, country, region, city, device_type, browser, os, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [linkId, country, region, city, deviceType, browser, os, referrer]
    );
  } catch (err) {
    console.error(`Failed to log click for link ${linkId}:`, err.message);
  }
}

// All aggregation happens in SQL rather than pulling every row into Node
// and reducing it there — Postgres is far more efficient at this, and it
// keeps memory usage constant regardless of how many clicks a link has.
async function getLinkAnalytics(linkId) {
  const [totalResult, dailyResult, deviceResult, browserResult, osResult, countryResult, referrerResult] =
    await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM clicks WHERE link_id = $1', [linkId]),

      pool.query(
        `SELECT DATE(clicked_at) AS date, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY DATE(clicked_at)
         ORDER BY date ASC`,
        [linkId]
      ),

      pool.query(
        `SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY device_type ORDER BY count DESC`,
        [linkId]
      ),

      pool.query(
        `SELECT COALESCE(browser, 'unknown') AS browser, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY browser ORDER BY count DESC`,
        [linkId]
      ),

      pool.query(
        `SELECT COALESCE(os, 'unknown') AS os, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY os ORDER BY count DESC`,
        [linkId]
      ),

      pool.query(
        `SELECT COALESCE(country, 'unknown') AS country, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY country ORDER BY count DESC`,
        [linkId]
      ),

      pool.query(
        `SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY referrer ORDER BY count DESC
         LIMIT 10`,
        [linkId]
      ),
    ]);

  return {
    totalClicks: totalResult.rows[0].total,
    clicksOverTime: dailyResult.rows.map((r) => ({ date: r.date, count: r.count })),
    deviceBreakdown: deviceResult.rows,
    browserBreakdown: browserResult.rows,
    osBreakdown: osResult.rows,
    countryBreakdown: countryResult.rows,
    topReferrers: referrerResult.rows,
  };
}

module.exports = { logClick, getLinkAnalytics };
