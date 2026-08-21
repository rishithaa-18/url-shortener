// Minimal migration runner for Phase 1.
// We're not using a full migration framework (like knex or node-pg-migrate) yet
// because right now we only have one schema file. We'll revisit this if the
// schema starts changing often enough that "just re-run schema.sql" stops being safe.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schemaSql);
    console.log('✅ Schema applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
