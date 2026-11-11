# Data lifecycle — Checkpoint B acceptance report

9 November 2026. **Non-destructive development implementation complete; deployed enforcement and scheduling remain disabled. Checkpoints C, D and E have not started.** The [approved design](data-lifecycle-checkpoint-a.md) and subsequent approval require export/recovery and customer-notification readiness before live day-60 enforcement.

Follow-up, 9 November: B was accepted and C authorized for isolated development. See [Checkpoint C implementation and acceptance](data-lifecycle-checkpoint-c.md). The original B evidence below is retained; C does not remove the deployed enforcement gate or authorize D.

## 1. Delivered scope and safety boundary

Implemented a centralized lifecycle calculation, archive/cancellation journal, content-free transition events, renewal integration, restricted state messaging, read-only impact assessment and authenticated bounded scheduler. No deletion, anonymization, export download, recovery grant, customer email or early-cancellation/refund behavior was implemented.

Neither `.env` nor any remote provider configuration was changed. No production/preview migration or deployment was performed. The normal local `core_ops_db` remains on its original 13 migrations. Its records were read for backup/preservation/aggregate impact assessment only. All migration writes and lifecycle fixture operations used explicitly named isolated local databases.

The following controls are implemented, not merely documented:

| Setting | Default / enforcement |
| --- | --- |
| `COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED` | Off unless exactly `true`. When off, normal commercial access retains its prior behavior; new lifecycle tables are not required by ordinary access queries. |
| Rehearsal-only gate | Even with enforcement requested, reject Vercel environments and any database except a loopback `coreops_auth_rehearsal_*` database. **This release cannot enable deployed lifecycle enforcement through environment variables alone.** |
| `COREOPS_LIFECYCLE_PROCESSING_ENABLED` | Off unless exactly `true`, and requires the rehearsal enforcement gate. Controls scheduled materialization, independently from effective access calculation. |
| `CRON_SECRET` | Required for every HTTP scheduler request, including dry-run; at least 32 characters, constant-time bearer comparison, never logged. No real secret was generated into `.env`. |
| Purge | No purge service, endpoint, scheduler or supported purge environment switch exists in B. Retention expiration never deletes a record. |

An independently suspended workspace can no longer be activated through an ordinary subscription request, even when lifecycle enforcement is off. It requires the existing authorized restriction-review workflow. Existing SUPER_ADMIN restoration of an eligible, non-revoked paid workspace is preserved; the new lifecycle guard prevents that workflow bypassing cancellation when rehearsal enforcement is on.

## 2. Files and migrations

| Files | Change |
| --- | --- |
| [schema](../prisma/schema.prisma) | `WorkspaceLifecycle`, `WorkspaceLifecycleEvent`, event-type enum and `LifecycleJobRun`; reverse relations and tenant-safe period identity. |
| [20261109000100_lifecycle_checkpoint_b](../prisma/migrations/20261109000100_lifecycle_checkpoint_b/migration.sql) | Additive schema, unique event operation keys, compound period/workspace FKs, deadline/count checks, current-coverage index, deadline validation and event update-immutability triggers. **No data backfill.** |
| [20261109000200_lifecycle_job_outcomes](../prisma/migrations/20261109000200_lifecycle_job_outcomes/migration.sql) | Forward addition of bounded per-workspace scheduler outcomes. The first migration was not edited after rehearsal. |
| [policy](../src/server/lifecycle/policy.ts), [configuration](../src/server/lifecycle/config.ts), [clock](../src/server/lifecycle/clock.ts), [service](../src/server/lifecycle/service.ts) | UTC calculations, release restrictions, database clock after lock acquisition, authoritative coverage, transactional state/event persistence and activation guard. |
| [scheduler](../src/server/lifecycle/scheduler.ts), [handler](../src/server/lifecycle/handler.ts), [route](../src/app/api/lifecycle/process/route.ts) | Bounded, retry-safe machine processing, persisted outcomes/cursor, read-only dry-run and private HTTP responses. |
| [commercial access](../src/server/commercial/access.ts), [commercial service](../src/server/commercial/service.ts) | Central lifecycle reads, day-60 denial in rehearsals, activation/cancellation serialization, archive-to-active events and suspension protection. |
| [tenant layout](../src/app/w/[workspaceSlug]/layout.tsx) | Archive/read-only, grace and canceled messaging under the existing restricted shell. No export/recovery capability is advertised as available. |
| [route policy](../src/lib/routing/request-plan.ts), [proxy tests](../tests/proxy.test.cjs) | Exact central GET machine-route exception before interactive Clerk; apex/tenant/mutation denial in subdomain mode. Handler separately enforces host and secret. |
| [impact program](../scripts/audit-workspace-lifecycle.cjs), [package scripts](../package.json) | Read-only aggregate assessment; `audit:workspace-lifecycle`, `test:lifecycle-policy`, `test:lifecycle`. |
| [policy tests](../tests/lifecycle-policy.test.cjs), [integration tests](../tests/lifecycle.integration.cjs), [migration fixture](../tests/lifecycle-migration-fixture.cjs), [HTTP smoke](../tests/lifecycle-http-smoke.cjs) | UTC boundaries, real PostgreSQL and concurrency checks, pre/post-migration business-data fingerprints, and actual built-route checks. |
| This report and Checkpoint A follow-up | Evidence, configuration, limits and approval boundary. |

Pre-existing Clerk-readiness changes in the working tree were left intact and are not part of this implementation: `docs/phase5-staging-acceptance.md`, `docs/preview-clerk-setup.md`, `scripts/inspect-clerk-auth.cjs`, `src/server/auth/clerk-configuration.ts`, `src/lib/auth/`, and `tests/auth-configuration.test.cjs`.

## 3. State transitions and subscription integration

For the latest applicable, activated, non-revoked paid period ending at `E`:

| Boundary | Effective result |
| --- | --- |
| Before `E` | ACTIVE, existing entitlements and role/assignment filters |
| `E` inclusive to `E + 7 UTC days` exclusive | GRACE, existing grace writes retained |
| `E + 7` inclusive to `E + 60` exclusive | ARCHIVED, original role-filtered reads; business/member/invitation writes denied |
| `E + 60` inclusive | CANCELED, normal operational reads/writes denied; reviewed recovery required for activation |
| Cancellation plus 90 days | Calculated retention expiry only; **no deletion or claim of fully reviewed purge eligibility** |

Calendar-day addition preserves UTC time of day and milliseconds. Future activated periods do not prematurely replace the current period's entitlements. At their start, they become applicable coverage. Pending requests, unverified payment submissions and independently verified funds without administrator activation never extend paid coverage.

All write-side decisions use the existing Workspace row lock. The service reads `clock_timestamp()` after acquiring it, rather than transaction-start time before a wait. Activation rechecks the effective cutoff and any persisted cancellation, independently of scheduler progress. It remains subject to verified ownership, commercial approval, accepted quote, independently verified funding, capacity, SUPER_ADMIN authorization/MFA and transactional administrator rechecks.

Before a permitted archive renewal, synchronize the previous episode; after creating the paid period, synchronize new coverage in the same activation transaction. Archive history is preserved and a reactivation event is emitted once. Canceled journals stay canceled: B contains no authority or code path to grant post-cancellation recovery. Replayed activation requests return the original period and do not create overlapping periods.

Manual suspension, closure and revoked-payment restrictions remain independent. The scheduler skips pending, suspended and closed workspaces; it does not invent retention start dates for these unresolved policy cases. Access remains blocked by their existing administrative restrictions.

Materialization on a late run records original effective archive/cancellation deadlines and a separate recorded timestamp. For example, observing an 80-day-expired workspace records cancellation at expiry plus 60 days and retention expiry at expiry plus 150 days. It does not add 90 days to the job's execution time.

## 4. Event contract and audit atomicity

`WorkspaceLifecycleEvent` contains only:

- Stable event `id` and typed `type` (`WORKSPACE_ARCHIVED`, `WORKSPACE_CANCELED`, `WORKSPACE_REACTIVATED`).
- Workspace ID, lifecycle episode ID, effective and recorded timestamps, policy version and unique operation key.

The episode identity is the paid period ID whose expiration created that lifecycle episode. A reactivation event refers to the prior archived episode. Compound foreign keys prevent an event/journal from referring to another workspace's paid period.

Events and journal/subscription changes commit atomically. A repeated operation returns the existing event only if its identity/type/effective time/policy match; mismatched keys fail and roll back the entire transition. Update triggers reject rewriting event history. This is application audit evidence, not a claim of tamper-proof protection against privileged database administrators or backups.

No customer business content, email, client name, payment instructions, receipt details or provider tokens appear in event rows. A later notification outbox can attach to stable event IDs with unique delivery keys. **No outbox consumer exists in B.** A future consumer must use durable processing/uniqueness, not rely solely on recorded-time pagination: transaction commit order need not equal timestamp order.

## 5. Scheduler and security configuration

Endpoint: `GET /api/lifecycle/process` on the configured central application host. Path-mode local/preview origins still pass the existing host policy. Subdomain apex/tenant hosts and POST are denied. This exact GET avoids Clerk's interactive handshake; it is independently protected by the server-side bearer secret and central-host check.

Parameters:

- `dryRun` defaults to `true`; only `true`/`false` accepted. Dry-run executes selection only: no journal, events, run records, emails or customer changes.
- `limit` defaults to 25, bounded to 1–50.
- Optional `after` is an opaque bounded scan cursor, never authorization. Non-dry runs without an explicit cursor resume from the latest completed run, then cycle to the start to retry failed/locked rows and discover newly eligible lower IDs.

Processing selects eligible paid coverage, then independently rechecks each workspace under a short transaction with `FOR UPDATE SKIP LOCKED`. Overlapping workers may see the same candidate; row locks and deterministic event keys prevent conflicting/duplicate transitions. A run stops taking new work after approximately 18 seconds; each workspace transaction is bounded to eight seconds. The route has a 30-second function budget. Large-volume query/runtime behavior remains to be measured before deployment; interrupted runs remain identifiable by missing completion timestamps.

Run records contain counts, cursor, completion and at most 50 content-free workspace outcomes (`TRANSITIONED`, `UNCHANGED_OR_LOCKED`, `TRANSITION_FAILED`). Sanitized failure codes support review; raw database/provider error payloads are not logged. If run-history persistence fails after a workspace commit, retry recalculates safely; state and event atomicity do not depend on the run counter being current.

No `vercel.json`, deployed schedule, external worker, administrator bootstrap or email integration was added. The scheduler implementation is ready for isolated invocation, not approved for unattended live processing.

## 6. Migration rehearsals and existing-workspace impact

New protected local backup: `.backups/coreops-before-lifecycle-20261109.dump`, permission **0600**. Existing backups were not overwritten. A local archive is not evidence of encrypted, durable provider backup retention.

| Database | Verification |
| --- | --- |
| `coreops_auth_rehearsal_lifecycle_20261109` | Created empty; full existing chain plus both new migrations applied. Real integration tests use disposable, scoped fixtures and clean up their records. Prisma 7.8 diff reports **No difference detected**. |
| `coreops_auth_rehearsal_lifecycle_restore_20261109` | Restored protected local backup; additive migrations applied. All 24 original-table record counts/fingerprints matched the source; no lifecycle rows/events backfilled. |
| `coreops_auth_rehearsal_lifecycle_populated_20261109` | Restored pre-migration schema, added synthetic operational/commercial/assignment fixtures, applied both migrations; all 13 populated-table fingerprints matched. No lifecycle rows/events backfilled. Synthetic review fixtures remain only in this dedicated database. |
| Normal `core_ops_db` | Not migrated; original 13 applied migrations remain. Read-only impact groups: **2 PENDING_ACTIVATION workspaces, no subscription records and no paid periods. Zero expired paid workspaces observed.** |

Run `npm run audit:workspace-lifecycle` for an explicitly configured target. It uses a PostgreSQL `BEGIN READ ONLY` transaction and returns grouped administrative/commercial/calculated-state counts, not customer content. It never repairs or backfills data. The local result is not an assessment of preview/production; those environments were not queried. Repeat impact assessment and review on each approved target before any rollout.

## 7. Automated and HTTP evidence

| Check | Final result / limit |
| --- | --- |
| `npm run test:lifecycle-policy` | **3 passed**: exact UTC boundaries, calendar/timezone/delayed-observation behavior, disabled/deployed gates |
| Isolated `node tests/lifecycle.integration.cjs` | **11 passed including the parent container**, zero failures. Ten scenarios cover real database constraints, role filtering, shared identities, concurrent transitions/renewal, actual lock wait across cutoff, event/audit rollback, funds/MFA/role checks, deadline/tenant tampering, future coverage, retention without deletion, scheduler authentication/host/cursor/outcomes. |
| Combined existing authorization/commercial/identity/payment/proxy suites | **76 passed including parent containers**, zero failures |
| Existing authorization suite with rehearsal enforcement enabled | **25 passed including parent container**, zero failures |
| `npm run test:navigation` / `npm run test:host-policy` | **4 / 9 passed** |
| `npm run test:auth-configuration` | **3 passed**; existing Clerk/legal safeguards remain intact |
| Prisma validation, migration rehearsals and schema diff | Passed; no drift. Raw checks/triggers additionally exercised by integration tests. |
| `npm run typecheck` | Passed |
| `npm run lint` | Zero errors; **12 existing unused-import warnings** in business pages |
| `npm run build` | Passed locally; bundle includes the lifecycle machine route. No deployment. |
| Production-bundle loopback HTTP smoke | **5 passed**: machine authentication, forged-context denial, Clerk bypass, private dry-run, disabled writes and POST denial checked against the isolated database; before/after lifecycle/event/run counts matched. Temporary server stopped. No signed-in authentication claim. |
| Real signed-in browser / deployed Cron | **Not performed.** No Clerk session, Google/MFA, deployed header behavior, email inbox or customer export/recovery journey is established by these tests. |

Initial test setup required correcting fixture catalog versions, explicit receiving-account activation and a fixture field name; application safeguards were retained. The sandbox initially prevented Turbopack port binding and a diagnostic child process; those checks passed when rerun with local process permissions. No account or provider permissions were changed to obtain passing tests.

Reproduce against an isolated migrated database, never the application database:

```bash
npm run test:lifecycle-policy
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_lifecycle_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/lifecycle.integration.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_lifecycle_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/authorization.integration.cjs \
  tests/commercial.integration.cjs tests/identity.integration.cjs \
  tests/paystack-vat.integration.cjs tests/proxy.test.cjs
COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED=true \
  COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_lifecycle_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/authorization.integration.cjs
npm run typecheck
npm run lint
npm run build
```

The migration-fixture program requires its separately named `coreops_auth_rehearsal_lifecycle_populated_*` database. Run `prepare /tmp/<new-evidence>.json` before `prisma migrate deploy`, then `verify` with that same file after migration. Preparation creates only synthetic fixtures and refuses to overwrite its fingerprint evidence. The HTTP smoke program requires a completed local build and isolated URL; it creates an ephemeral secret, starts its own loopback server on port 3100 and stops it afterward.

Temporary evidence: `/tmp/workflowconnect-lifecycle-{policy,integration,regressions,authorization-enabled,navigation,host,auth-config,types,lint,build,drift,http,impact,preservation,fresh-migrate,restored-migrate,populated-migrate,populated-prepare,populated-verify}.log`. These logs and the fingerprint JSON are local evidence, not a durable rollout archive.

## 8. Outstanding decisions and next gates

1. **Checkpoint C approval and implementation:** secure owner export, reviewed historical-owner recovery, recent step-up policy, data minimization and real signed-in testing. B blocks post-cancellation activation; it does not provide a recovery workaround.
2. **Customer notifications:** approved notice timing, delivery/evidence, retries and alternatives. No emails are sent or marked delivered. Day-60 live enforcement remains prohibited until addressed.
3. **Early cancellation/refunds, never-paid abandonment, suspension/closure retention:** unresolved policies remain unimplemented. No invented dates or automatic refunds.
4. **Retention exceptions, deletion ledger and restore quarantine:** remain Checkpoint D blockers. Ninety-day deadline calculation is not legal approval to delete financial, audit or customer invoice data.
5. **Provider/operations:** live backups, encryption/access/retention, actual Vercel header and secret handling, monitoring, rate limiting and realistic volume measurements require target-specific confirmation.

The broader [launch-readiness checklist](launch-readiness.md) still applies. This change does not resolve operational invoice validation/idempotency or other unrelated launch findings.

### Before enabling processing in any deployed environment

There is deliberately no deployment-enable command for this B release. Required sequence:

1. Review this report and separately approve C. Complete and approve export/recovery plus required customer-notification arrangements before day-60 enforcement.
2. Review a follow-up change replacing the rehearsal-only configuration gate with an approved deployment contract. Do not bypass it with a renamed database or misleading Vercel environment values.
3. Confirm the exact isolated target/database, read-only impact report, customer transition treatment, protected backup and successful full-chain/populated-data rehearsal. Obtain explicit migration/rollout authorization for that environment; production requires separate approval.
4. Apply pinned Prisma migrations with enforcement/processing still off; validate drift, constraints and preserved records. Install the matching generated Prisma client. No automatic backfill is part of these migrations.
5. Configure a protected server-only `CRON_SECRET`, exact central host, monitoring and authorized invocation. First run authenticated dry-run with both flags off and review aggregate impact/candidate counts. Complete deployed host/Clerk/Server Action and signed-in role acceptance.
6. Approve enforcement and non-destructive scheduling independently. Only then configure the reviewed release controls and a bounded cron schedule; examine outcomes/failures and request-level cancellation behavior. Purge remains a separate unapproved checkpoint.

For isolated reproduction today, set the two lifecycle flags only in a test process using the guarded rehearsal URL. The integration suite does this internally; it does not edit `.env`.

Rollback: stop processing and preserve events/journals; prefer a forward correction. Disabling rehearsal enforcement restores prior access behavior and is **not a safe future live rollback** once customers have been canceled. A later deployed rollout must retain canceled-access denial while jobs are paused. Do not edit applied migrations, drop history or restore old data into active use to undo lifecycle decisions.

**Stop here for Checkpoint B review.** No C/D/E work, production migration, live cancellation, email delivery or destructive cleanup is authorized by this report.
