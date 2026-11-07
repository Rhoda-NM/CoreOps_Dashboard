/* eslint-disable @typescript-eslint/no-require-imports -- read-only Node operator script */
const { Client } = require('pg');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const { auditWorkspaceSlugs } = require('../src/lib/routing/workspace-slug.ts');
// Explicitly read-only. No repair, backfill, schema mutation or credentials in output.
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const { rows } = await client.query('SELECT id, slug FROM "Workspace" ORDER BY id');
    const result = auditWorkspaceSlugs(rows);
    await client.query('COMMIT');
    console.log(JSON.stringify(result, null, 2));
    if (result.problems.length) process.exitCode = 1;
  } finally { await client.end(); }
})().catch(() => { console.error('Workspace hostname audit failed. Check connection and schema; no changes were attempted.'); process.exitCode = 1; });
