-- Phase 1 schema: users + links
-- (clicks table is added in Phase 2 when we start tracking analytics)

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_url    TEXT NOT NULL,
    short_code      VARCHAR(20) UNIQUE NOT NULL,
    is_custom_alias BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Redirect lookup runs on every single redirect request.
-- Without this, Postgres does a full table scan as `links` grows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);

-- Dashboard: "show me all links belonging to this user"
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);

-- Note: user_id is nullable by design for now — Phase 1 has no auth yet,
-- so links can exist without an owner. We'll tighten this once Phase 6 (auth) lands.

-- Phase 2: clicks table (one row per redirect event).
-- We deliberately do NOT store the raw IP address here — see geo.service.js
-- for why. We only keep what's derived from it (country/region/city).
CREATE TABLE IF NOT EXISTS clicks (
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

-- Every analytics query filters by link_id and usually orders/buckets by time,
-- so a composite index on (link_id, clicked_at) covers both in one pass
-- instead of Postgres needing a separate sort step after the filter.
CREATE INDEX IF NOT EXISTS idx_clicks_link_id_clicked_at ON clicks(link_id, clicked_at);
