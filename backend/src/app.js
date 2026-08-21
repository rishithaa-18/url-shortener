const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const linksRoutes = require('./routes/links.routes');
const redirectRoutes = require('./routes/redirect.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Controls how req.ip is derived from X-Forwarded-For.
//
// `true` (the previous setting) trusts EVERY hop in the header, including
// values a client could inject themselves before the request ever reaches
// our actual reverse proxy — e.g. a client sending
// "X-Forwarded-For: 1.2.3.4" directly would have req.ip resolve to that
// spoofed address. Since rate limiting and geolocation both key off req.ip,
// that's a real way to dodge the rate limiter or fake a location.
//
// Setting this to a specific hop COUNT instead fixes it: Express then only
// trusts the last N proxies' worth of the header and ignores anything a
// client tried to prepend before that. TRUST_PROXY_HOPS defaults to 1,
// which matches deploying behind exactly one reverse proxy/load balancer
// (Render, Railway, Fly, etc. all sit in front of your app this way).
// Locally, with no proxy in front of the app at all, this setting is
// simply unused — req.ip falls back to the direct socket address either way.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

// Security headers (X-Content-Type-Options, HSTS, frame-ancestors, etc).
// We disable Helmet's default Content-Security-Policy: this is a JSON API
// plus a redirect endpoint, not a page that serves its own HTML/JS/CSS —
// a CSP is meaningful for the frontend (which Vercel/the frontend build
// handles separately), not for this server.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS is an allowlist, not wide open. Why this matters even though the
// API has no cookies/sessions to steal: without a restriction, any website
// could run client-side JS that calls our API on a visitor's behalf. An
// allowlist means only requests originating from our own frontend's origin
// are allowed to read responses via fetch/XHR.
//
// Note this does NOT affect people clicking short links from anywhere
// (Twitter, email, etc.) — CORS only governs cross-origin fetch/XHR calls,
// not top-level browser navigation, so GET /:shortCode redirects are
// unaffected regardless of where the link was clicked from.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      // `origin` is undefined for non-browser requests (curl, Postman,
      // server-to-server) — allow those through; CORS is a browser-enforced
      // concept and doesn't apply to them anyway.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const err = new Error('Not allowed by CORS');
      err.statusCode = 403;
      err.code = 'CORS_NOT_ALLOWED';
      callback(err);
    },
  })
);

app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/links', linksRoutes);

// Redirect route is last and lives at the root, not under /api, so that
// short links look like "yourdomain.com/abc123" rather than an API call.
app.use('/', redirectRoutes);

// 404 for anything that matched no route above
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

module.exports = app;
