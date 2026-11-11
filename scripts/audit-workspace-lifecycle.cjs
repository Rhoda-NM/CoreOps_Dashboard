/* eslint-disable @typescript-eslint/no-require-imports -- read-only operator program */
const { Client } = require('pg');
// Uses the configured database but never writes, repairs, or prints customer content.
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const { rows } = await client.query(`
      SELECT w."activationStatus" AS administrative_status,
        s.status AS subscription_status,
        CASE WHEN p.id IS NULL THEN 'NO_PAID_PERIOD'
             WHEN p."endsAt" > CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN 'ACTIVE'
             WHEN p."endsAt" + interval '7 days' > CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN 'GRACE'
             WHEN p."endsAt" + interval '60 days' > CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN 'ARCHIVED'
             ELSE 'CANCELED' END AS calculated_stage,
        count(*)::int AS workspace_count
      FROM "Workspace" w
      LEFT JOIN "Subscription" s ON s."workspaceId" = w.id
      LEFT JOIN LATERAL (SELECT id, "endsAt" FROM "SubscriptionPeriod"
        WHERE "workspaceId" = w.id AND "revokedAt" IS NULL
          AND "startsAt" <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        ORDER BY "endsAt" DESC LIMIT 1) p ON true
      GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`);
    console.log(JSON.stringify({ mode: 'READ ONLY', at: new Date().toISOString(), groups: rows, note: 'Calculated impact only; no cancellation backfill or enforcement. Manual restrictions remain independent.' }, null, 2));
    await client.query('ROLLBACK');
  } finally { await client.end(); }
}
main().catch(() => { console.error('Lifecycle impact assessment failed; no customer details logged.'); process.exitCode = 1; });
