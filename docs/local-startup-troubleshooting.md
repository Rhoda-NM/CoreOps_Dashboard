# Local startup repair — 7 November 2026

## Findings and fixes

The supplied log contained two independent failures: Prisma P1001 (PostgreSQL unavailable at localhost:5435), and a Turbopack internal loader-tree/cache panic. Inspection found the existing `core_ops_db` container stopped and the filesystem nearly full. Generated `.next` output occupied approximately 4.7 GB.

Only generated `.next` output was cleared. The existing PostgreSQL container was started, without running migrations or changing records. A subsequent clean database shutdown was observed; it was restarted and its schema checked read-only. The original configured `core_ops_db` has eight applied migrations and no `TaxConfiguration` table. Starting that container alone therefore does not make it compatible with the newer commercial schema.

The public marketing loader now handles recognized database connectivity and missing-table/column errors by returning contact-only availability. It suppresses offers, signup readiness and claims about current VAT configuration. The public pricing UI explains that pricing is temporarily unavailable. Unexpected programming, authorization and credential errors still propagate. Sanitized warning logs contain only the Prisma error code, never provider payloads or connection strings. Operational, authorization, payment and activation services retain their existing failure behavior.

No `.env`, schema, migrations, records, permissions or external configuration were changed. No production actions were taken.

## Verification

- `npm run test:marketing-availability`: two passing tests cover outage/schema failure, sanitized logs, disabled signup, recovery, and propagation of unexpected errors.
- `npm run test:brand`: six passing tests, including rendered unavailable-pricing copy with no VAT assertion or signup CTA.
- `npm run typecheck`: passed.
- Focused ESLint and `git diff --check`: passed.
- Fresh `npm run dev` startup succeeded with Turbopack after cache removal. Local HTTP checks returned 200 for `/`, `/pricing` and `/manifest.webmanifest`; public pages displayed contact-only availability during the actual outage.
- Authenticated browser flows were not tested. A production build was not repeated for this targeted error-handling change.

## Running a complete local application

Keep the source database intact. For commercial/authenticated development, use the already migrated isolated release rehearsal database, without rewriting `.env`:

```bash
docker start core_ops_db
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs npm run dev
```

Stop any existing development server first. The runner requires a local host and a database name beginning with `coreops_auth_rehearsal_`. It does not create or migrate databases. Do not use it for cloud preview or production.

The public fallback is not a substitute for a migrated, available database: signed-in operations and payments require the complete schema. Preview and production provisioning/approval requirements remain in the deployment report.

The `/sw.js` 404 is a separate request for an unimplemented service worker; no offline/PWA behavior was introduced to hide it. Clerk development-key and `createRouteMatcher` deprecation notices are separate from the homepage failure. Existing server-side resource authorization remains necessary.

If a Turbopack internal panic recurs after a clean cache restart, the supported diagnostic alternative is `npm run dev -- --webpack` ([Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next)). Keep disk space available; no unrelated files or backups were removed here.

## Access navigation follow-up

The public “Get access” CTA now links to `/sign-in` across the header, landing page, pricing cards and static demo. Account access no longer depends on catalog availability or opens an email client. Registration readiness, unpublished pricing, pending-workspace restrictions and commercial activation remain independently enforced.

A browser check on 7 November clicked the landing-page CTA and observed Clerk's Google/email sign-in form at `/sign-in`. No credentials were entered or authenticated session established. Clerk's development instance still presents “My Application”; update its external branding before launch. Development keys must remain confined to development.

`public/sw.js` now serves a minimal retirement worker: it skips waiting and unregisters its own registration on activation. It has no fetch handler and does not cache business pages or delete other browser data. No registration call exists in the current app source; the initiating source of the reported repeated requests was not conclusively identified. This endpoint permits compatible old registrations to retire, while serving 200 for `/sw.js`.

After the change, both focused test programs passed (eight tests total), TypeScript passed, and the actual Clerk form rendered in the browser. This is anonymous navigation validation, not signed-in or Google OAuth acceptance.

## Recurrent sign-in 404 follow-up

A later running dev server reproduced HTTP 404 at `/sign-in` even though the optional catch-all route source existed. After disabling `experimental.turbopackFileSystemCacheForDev`, stopping the local launcher and server, and removing only `.next/dev`, a fresh dev server resolved the route. This is a mitigation for the observed development routing/cache failures, not proof of the underlying Turbopack defect. The option is supported by the installed Next.js 16.2.4 types ([Next.js filesystem cache configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache)). Production build caching was not changed.

Verification after repair: `/sign-in`, `/sign-in/factor-one`, and `/platform/sign-in` returned HTTP 200. The browser's landing-page “Get access” link opened `/sign-in`; a direct reload still rendered the Clerk Google/email form. No authentication was submitted. `npx tsc --noEmit`, focused `next.config.ts` ESLint, and whitespace checks passed. The replacement development server remains on localhost:3000. No database changes were made.

## Local dashboard schema synchronized

Later on 7 November, the signed-in dashboard failed with Prisma P2022 because the configured local database still had eight migrations and lacked `Workspace.activationStatus`. The five existing commercial/VAT/Paystack migrations have now been applied to localhost `core_ops_db`. This supersedes the earlier statements above that the source database remains unmigrated. No reset, deletion, production migration, administrator bootstrap or activation was performed.

Before applying locally:

- Created and inspected `.backups/before-dashboard-schema-20261107_1794054858258.dump` (owner-only), with adjacent SHA-256 file.
- Restored it into `coreops_auth_rehearsal_dashboard_20261107_1794054858258`.
- All ten ownership audit problem counts were zero, with no orphan IDs.
- Applied all five pending migrations successfully on that restored copy.
- Compared every original field and record count using database-native JSON serialization. Rehearsal preserved two users, two workspaces, two memberships and zero Client/Project/Task/Invoice/Subscription records.

Then applied the same migrations to the guarded local target. Prisma reported 13 applied migrations and **No difference detected**. Original field values and record counts matched the protected snapshot after migration. The actual dashboard `workspaceMember.findMany` query, including its Workspace relation and ACTIVE filter, passed for existing users. The tax catalog query also passed.

Both existing workspaces now default to PENDING_ACTIVATION. No historical subscription, receipt, paid period or platform administrator was invented. All eight migration-seeded draft offers remain unpublished; VAT configuration count is zero. Pending owners must follow subscription onboarding; this repair does not grant operational access. `.env` was not changed. No complete signed-in browser journey was performed during this repair.

Evidence: `/tmp/workflowconnect-schema-repair.log` and `/tmp/workflowconnect-local-schema-applied.log`. Localhost development can now use the normal `npm run dev` with the configured database; the isolated rehearsal runner remains appropriate for automated tests. Temporary local evidence is not durable backup storage.
