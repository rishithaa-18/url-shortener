// A connection pool, not a single connection.
// Why: every incoming request needs a DB connection, and opening a fresh
// TCP connection to Postgres per-request is slow and doesn't scale. The pool
// keeps a set of open connections ready to hand out and reuse.

const { Pool } = require('pg');

// SSL is explicitly controlled by DATABASE_SSL rather than inferred from
// the connection string or NODE_ENV. Local Postgres (this project's default
// setup) doesn't have SSL configured at all, so forcing it on by default
// would break local development. Managed providers (Neon, Supabase, RDS,
// etc.) require SSL and will refuse plain connections outright — so
// production deployments need DATABASE_SSL=true set explicitly.
//
// `rejectUnauthorized: false` is the standard setting for these providers:
// it enables encryption-in-transit (the actual security property we want —
// nobody sniffing the connection between our app and the database) without
// requiring us to manage a specific CA certificate chain, which most
// managed providers' free tiers don't hand you anyway.
const useSSL = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // max simultaneous connections — fine for a small app; tune later if needed
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Fires on idle client errors (e.g. DB restarts). We log it instead of crashing
  // the whole process — a single bad connection shouldn't take down the server.
  console.error('Unexpected Postgres pool error:', err);
});

module.exports = pool;
