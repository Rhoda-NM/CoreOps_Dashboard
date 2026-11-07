/* eslint-disable @typescript-eslint/no-require-imports -- read-only deployment preflight */
const { Client } = require('pg');
async function main() {
  const preview = new URL(process.env.COREOPS_PREVIEW_DATABASE_URL || 'invalid:');
  const production = new URL(process.env.COREOPS_PRODUCTION_DATABASE_URL || 'invalid:');
  const identity = u => `${u.hostname.replace('-pooler.', '.')}:${u.port || '5432'}${decodeURIComponent(u.pathname)}`;
  if (!['postgres:', 'postgresql:'].includes(preview.protocol) || !['postgres:', 'postgresql:'].includes(production.protocol)) throw Error('Provide both environment URLs through the process environment.');
  if (identity(preview) === identity(production)) throw Error('Preview and production resolve to the same endpoint/database.');
  if (preview.username === production.username && preview.password === production.password) throw Error('Use distinct preview and production credentials.');
  for (const [environment, url] of [['preview',preview],['production',production]]) {
    const client = new Client({ connectionString:url.toString() });
    try {
      await client.connect(); await client.query('BEGIN READ ONLY');
      const result = await client.query("SELECT current_database() AS database, count(*)::int AS public_tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
      await client.query('COMMIT'); console.log(JSON.stringify({environment,readOnly:true,database:result.rows[0].database,publicTables:result.rows[0].public_tables}));
    } finally { await client.end(); }
  }
}
main().catch(()=>{console.error('Environment isolation check failed. Check distinct endpoints, roles, TLS and access; no credentials are logged.');process.exitCode=1;});
