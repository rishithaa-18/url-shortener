# Snip — URL Shortener & Analytics Platform

A full-stack URL shortener with real click analytics, Redis caching, and Redis-backed rate limiting — built to demonstrate backend engineering and system design, not just CRUD.

**Live app:** [your-frontend-url.vercel.app](https://your-frontend-url.vercel.app)  

> Backend is on Render's free tier, which sleeps after 15 minutes of inactivity — the first request after a while can take 30–60 seconds to wake it up.

---

## Features

- Shorten a URL, with an optional custom alias and expiration date
- Redirect with active/expired/disabled states handled explicitly
- Per-link analytics: total clicks, clicks over time, device/browser/OS breakdown, country breakdown, top referrers
- Redis-cached redirects with graceful fallback to Postgres if Redis is unavailable
- Redis-backed sliding-window rate limiting on link creation
- Enable/disable and delete links

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Cache / rate limiting | Redis (Upstash, via `ioredis`) |
| Hosting | Vercel (frontend), Render (backend) |

---

## Architecture

```
   React (Vercel) → Express API (Render) → PostgreSQL (Neon)
                                        └→ Redis (Upstash)
```

Postgres is the source of truth for links and clicks. Redis is a pure accelerator — it caches `short_code → original_url` lookups and tracks rate-limit counters. If Redis goes down, the app keeps working correctly, just slower, by falling back to Postgres directly.

**Redirect flow:** check Redis → hit: log click, redirect immediately → miss: look up Postgres (checks active/expiry), cache the result, redirect. Click logging is fired without blocking the redirect response.

---

## Database schema

```sql
CREATE TABLE links (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_url    TEXT NOT NULL,
    short_code      VARCHAR(20) UNIQUE NOT NULL,
    is_custom_alias BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clicks (
    id           BIGSERIAL PRIMARY KEY,
    link_id      INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    country      VARCHAR(2),
    region       VARCHAR(100),
    city         VARCHAR(100),
    device_type  VARCHAR(20),
    browser      VARCHAR(50),
    os           VARCHAR(50),
    referrer     TEXT
);
```

`clicks` is a separate table (not a counter column) so questions like "clicks over the last 7 days" or "device breakdown" can be answered with SQL `GROUP BY`. Key indexes: `UNIQUE(short_code)` for redirect lookups, `(link_id, clicked_at)` composite for analytics queries. Raw IPs are never stored — only the derived country/region/city, resolved once at request time.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/links` | Create a short link |
| `GET` | `/api/links` | List links |
| `GET` | `/api/links/:id` | Get one link |
| `PATCH` | `/api/links/:id` | Activate/deactivate |
| `DELETE` | `/api/links/:id` | Delete a link |
| `GET` | `/api/links/:id/analytics` | Get analytics |
| `GET` | `/:shortCode` | Redirect |

---

## Key design decisions

- **Short codes:** random 7-character strings (`nanoid`), not sequential IDs (guessable) or URL hashes (collide when two people shorten the same link)
- **Caching:** cache-aside on the redirect path, TTL capped by the link's own expiry, actively invalidated on deactivate/delete. Every Redis call fails safe — verified by killing Redis mid-test and confirming redirects still worked via Postgres
- **Rate limiting:** sliding window (Redis sorted set) rather than fixed window, to avoid the classic boundary-burst problem. Applied only to link creation, not read endpoints. Fails open if Redis is down
- **Analytics:** all aggregation happens in SQL (`GROUP BY`), not pulled into Node — keeps memory constant regardless of click volume
- **Geolocation:** local offline IP database, not a third-party API — faster and never sends a visitor's IP anywhere external

---

## Local setup

```bash
# Backend
cd backend
npm install
cp .env.example .env      # fill in Postgres/Redis details
npm run migrate
npm run dev                 # http://localhost:3000

# Frontend
cd frontend
npm install
cp .env.example .env      # set VITE_API_BASE_URL
npm run dev                 # http://localhost:5173
```

**Key environment variables** (backend): `DATABASE_URL`, `DATABASE_SSL` (`true` for Neon), `REDIS_URL` (`rediss://` for Upstash), `FRONTEND_URL` (CORS allowlist). `TRUST_PROXY_HOPS` is optional — defaults to `1`, which already matches Render's single-proxy setup, so you don't need to set it unless overriding. (frontend): `VITE_API_BASE_URL`.

---

## Security

Helmet security headers · CORS restricted to an explicit origin allowlist · parameterized SQL throughout · URL protocol restricted to http/https, capped at 2048 chars · `trust proxy` set to exactly 1 hop (matching Render's topology, so client IPs used for rate limiting/geolocation aren't spoofable) · malformed JSON returns a clean 400 · Redis/Postgres failures degrade gracefully rather than crashing · graceful shutdown on `SIGTERM`.

---


## Screenshots

<!-- Drag and drop images here in the GitHub web editor, e.g.: ![Dashboard](./screenshots/dashboard.png) -->

**Dashboard**

**Analytics page**

---

## Future improvements
 
- User accounts/authentication, scoping links to their owner
- QR code generation per link
- Bulk link import/export
