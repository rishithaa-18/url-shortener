// Geolocation approach
// ---------------------
// We're using `geoip-lite`, which ships a local, offline copy of a
// city-level IP database rather than calling a third-party geolocation API
// over the network on every redirect. Why this matters:
//
// 1. Speed: no extra network round-trip on the redirect hot path.
// 2. Privacy: we never send a visitor's IP address to a third-party
//    service just to find out what country they're in.
// 3. Reliability: no external API to be down or rate-limit us.
//
// Tradeoff: the bundled database is coarser and goes stale over time
// (IP allocations shift). For a portfolio project this is a reasonable
// tradeoff; a production product at scale would likely pay for a
// commercial, regularly-updated IP database instead.
//
// What happens if lookup fails (private/local IPs, unrecognized ranges):
// we return nulls for country/region/city rather than throwing — a
// redirect should never fail because we couldn't figure out where the
// click came from.

const geoip = require('geoip-lite');

function lookupGeo(ip) {
  if (!ip) return { country: null, region: null, city: null };

  // Normalize IPv6-mapped IPv4 addresses (e.g. "::ffff:127.0.0.1")
  const cleanIp = ip.replace('::ffff:', '');

  const result = geoip.lookup(cleanIp);
  if (!result) {
    return { country: null, region: null, city: null };
  }

  return {
    country: result.country || null, // ISO country code, e.g. "IN"
    region: result.region || null,
    city: result.city || null,
  };
}

// Extracts the "real" client IP from a request.
// Why this isn't just `req.socket.remoteAddress`: in production, the app
// sits behind a reverse proxy/load balancer (Render, Railway, etc.), so the
// direct TCP connection is from the proxy, not the visitor. The proxy
// forwards the real IP in the `X-Forwarded-For` header. Express's
// `req.ip` handles this correctly ONLY if `trust proxy` is enabled — set
// in app.js.
function getClientIp(req) {
  return req.ip;
}

module.exports = { lookupGeo, getClientIp };
