/* eslint-disable @typescript-eslint/no-require-imports -- guarded Node operator/test runner */
const { spawnSync } = require('node:child_process');
// Run with node --env-file=.env. Never rewrites .env or creates databases.
const url = new URL(process.env.DATABASE_URL || 'invalid:');
const database = process.env.COREOPS_COMMERCIAL_REHEARSAL_DB || 'coreops_auth_rehearsal_commercial_20261106';
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^coreops_auth_rehearsal_[a-z0-9_]+$/.test(database)) throw new Error('Only a named isolated local rehearsal database is allowed.');
url.pathname = `/${database}`;
const args = process.argv.slice(2);
if (!args.length) throw new Error('Provide a command, for example npm run test:commercial.');
const result = spawnSync(args[0], args.slice(1), { env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() }, stdio: 'inherit' });
process.exit(result.status ?? 1);
