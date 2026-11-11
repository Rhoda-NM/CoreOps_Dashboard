# Notification service — Checkpoint N-B acceptance report

10 November follow-up: [N-C delivery simulation and administration report](notifications-checkpoint-nc.md) records the subsequent isolated implementation, independent fake-ledger/restore exercise and final gates. N-B evidence below is retained as historical acceptance.

10 November 2026. **Isolated capture-only foundation implemented. No external email delivery, deployed processing, or production/preview migration is enabled. Stop for N-B review.** The [N-A architecture](notifications-checkpoint-na.md), [schema proposal](notifications-schema-proposal.md) and B/C lifecycle safeguards remain the baseline.

## Delivered files and migration boundary

| Files | N-B change |
| --- | --- |
| `prisma/schema.prisma` | Eight notification models, closed state enums and existing-model inverse relations. Distinct capture counters/results prevent captures being represented as provider dispatch. |
| `prisma/migrations/20261109000400_notification_foundation/migration.sql` | Additive tables, relations, unique keys and ordinary indexes; no historical backfill. |
| `prisma/migrations/20261109000500_notification_integrity/migration.sql` | Tenant/pointer checks, immutable snapshots, notice-source/attempt/provider consistency, partial indexes, disabled external transport and legal-evidence gates. |
| `prisma/migrations/20261109000600_notification_capture_guards/migration.sql` | Capture-only control/metadata bounds, immutable notice obligations and suppression-evidence checks. |
| `prisma/migrations/20261110000100_notification_source_guard_fix/migration.sql` | Forward correction to a PL/pgSQL variable/alias conflict found by integration tests. Previously rehearsed migrations were not edited. |
| `prisma/migrations/20261110000200_notification_canonical_contract/migration.sql` | Canonical source and intent keys, closed source-to-kind mapping, historical-disposition protection and capture-attempt default. |
| `src/server/notifications/config.ts`, `registry.ts` | Rehearsal-only release gate, cutover, purpose-separated keyed identity/destination fingerprints and closed kinds/milestones. |
| `src/server/notifications/discovery.ts` | Fair, bounded gap reconciliation of committed events and commercial records. |
| `src/server/notifications/recipients.ts` | Current source/recipient policy, verified Clerk binding, claimant distinction, revoked/stale grant and artifact checks. |
| `src/server/notifications/worker.ts`, `capture-sink.ts` | Transactional claims, leases, stable capture identity, interrupted-worker recovery, independent relevance checks and sanitized runs. Sink has no email transport or network API. |
| `src/server/notifications/controls.ts` | Internal SUPER_ADMIN/recent-MFA configuration service, transactional role recheck and existing platform audit. No public action or new administration UI. |
| `src/server/notifications/handler.ts`, `src/app/api/notifications/capture/route.ts` | Exact authenticated central GET, private responses, bounds and read-only default. |
| `src/lib/routing/request-plan.ts`, `tests/proxy.test.cjs` | Exact central machine-route exception; tenant/apex/mutation denial in subdomain mode. Earlier B/C/Phase 4 changes in these files remain intact. |
| `tests/notifications.integration.cjs`, `tests/notifications-http-smoke.cjs` | Real PostgreSQL integration and actual local production-bundle HTTP checks. |
| `scripts/notification-migration-fingerprint.cjs`, `scripts/notification-preservation-fixtures.cjs` | Guarded isolated preservation evidence and synthetic populated fixtures. |
| `package.json` | Adds `test:notifications`; existing scripts retained. |

The eight responsibilities are `NotificationSource`, `NotificationOutbox`, `NotificationDeliveryAttempt`, `LifecycleNotice`, `NotificationProviderEvent`, `NotificationRun`, `NotificationSuppression` and `NotificationControl`. Provider evidence is a schema foundation, **not an authenticated provider-ingestion implementation**.

No business-service producer, payment verification rule, workspace permission matrix, identity binding or B/C event contract was replaced. No invitation email or global account-security producer was introduced. C's export implementation and 15-minute lifetime were not modified. Existing working-tree B/C and Clerk changes are separate from N-B.

## Committed-source mapping

| Authoritative committed source | Intents / disposition |
| --- | --- |
| Approved, still-unaccepted subscription quote | `QUOTE_READY` → current verified ACTIVE owners |
| Accepted quote, still commercially current | `QUOTE_ACCEPTED` → current verified ACTIVE owners |
| Manual payment submission still awaiting review | `PAYMENT_CLAIM_RECEIVED` → owners; `PAYMENT_REVIEW_REQUIRED` → active BILLING_ADMIN/SUPER_ADMIN |
| Independently verified receipt, manual or Paystack | One canonical `PAYMENT_VERIFIED` source per receipt → owners; reversed receipts cease to be actionable |
| Rejected payment plus matching committed platform audit | `PAYMENT_REVIEW_UPDATED` → owners |
| Receipt reversal | `PAYMENT_STATUS_CHANGED` → owners; generic review alert → billing/super administrators; no refund assertion |
| Closed request plus matching platform audit | `COMMERCIAL_REQUEST_CLOSED` → owners |
| Activated non-revoked paid period | `SUBSCRIPTION_CONFIRMED` → owners and independently eligible reviewed restoration claimant; overlapping audiences deduplicate |
| `WORKSPACE_REACTIVATED` / `WORKSPACE_RESTORED` | Durable audit-only disposition; confirmation coalesces with the paid-period source, using the explicit recovery activation-period relationship |
| Period deadlines | E−7 renewal; E grace; E+5 grace ending; E+7 archive; E+46 cancellation warning; E+60 cancellation; E+120/E+143 retention reminders |
| Committed archive/cancel event | Attach to the same period/milestone source as its scheduled obligation; no second source or message |
| `EXPORT_REQUESTED` / `EXPORT_READY` | Requester only; current owner or reviewed authority as appropriate; ready artifacts/grants must still be usable and unexpired |
| `EXPORT_FAILED` / `EXPORT_EXPIRED` | Generic request-specific status; no ready/download claim |
| `EXPORT_DOWNLOAD_AUTHORIZED` | Audit-only; no assertion of browser receipt |
| `RECOVERY_REQUESTED` | Verified claimant acknowledgement plus active SUPER_ADMIN review queue intent |
| Recovery approved/rejected/revoked/expired | Verified original claimant; approved variant requires valid current grant/binding; revocation/expiry messages do not require the withdrawn grant to remain usable |
| Checkout initialization audit | Audit-only; never verified payment or subscription activation |

References and recipients are local identifiers, not caller-supplied destinations. No addresses, quotation details, bank instructions, internal review text, ZIP bytes or tokens enter capture payloads. Captures store an identifier-envelope hash and binding fingerprints; no rendered email body is generated. Template identifiers/digests represent **capture placeholders**, not approved email copy.

Scheduled sources use authoritative immutable periods. Contiguous paid renewal suppresses the old episode's reminders; a currently applicable replacement period also invalidates stale expiry messaging. Pending money never extends coverage. Archive/cancellation confirmation waits for a matching committed domain event. Retention reminders additionally require the matching persisted cancellation episode. Notification code does not execute these domain transitions or establish legal retention authority.

ACCOUNT and PLATFORM scope enums exist, but SQL rejects those producer scopes in this release: their operation/incident contracts are not approved. Membership-security notices, pre-deletion evidence and operational-email alerts likewise need their separately approved producers/policies. They are not silently synthesized from unrelated audits.

## Reconciliation, processing and evidence

Discovery uses bounded `NOT EXISTS`/anti-join queries and canonical keys. It never advances a timestamp-only watermark. A round-robin database cursor selects **adapters**, not an event-time boundary; per-adapter caps prevent one backlog starving other fact types. Discovery is serialized with a transaction advisory lock, while outbox workers use independent row claims. Late commits with old timestamps remain discoverable.

`NotificationSource` preserves PENDING, WAITING_FOR_TRANSITION, WAITING_FOR_RECIPIENT, RESOLVED, AUDIT_ONLY, HISTORICAL_REVIEW and REVIEW_REQUIRED dispositions. RESOLVED means initial reconciliation, not permanent audience freeze or delivery. Within valid windows sources are revisited; a missing owner/disabled kind/temporarily unavailable identity remains distinguishable. Existing unique intentions survive template changes and retries. One source may yield several kinds and recipients.

Outbox processing is PENDING/RETRY_PENDING → CLAIMED → SETTLED, CANCELED, SUPPRESSED or MANUAL_REVIEW. Claims have random tokens, versions and 90-second leases. Provider I/O is absent. Clerk lookups happen outside database transactions; final source/role/binding checks happen under the existing Workspace lock before capture preparation and settlement. A recipient need not have an online session or MFA to receive a generic intention. Sensitive destination actions retain their existing live authentication/MFA policies.

Capture preparation persists its hash/binding/key and CAPTURE_INTENT before invoking the pure sink. Reclaim marks an unfinished prior capture CAPTURE_ABANDONED; a later attempt uses the same generation, key, hash and deterministic capture ID. Late workers cannot settle a newer lease. A restored actual-provider/UNKNOWN attempt instead requires manual reconciliation; it is never relabeled a safe capture.

A completed capture has `deliveryOutcome=NOT_SENT`, `dispatchedAttempts=0`, null dispatch/acceptance/delivery timestamps and no provider message ID. CAPTURED and SETTLED do **not** mean email sent. Lease retry never changes frozen identity or destination. Identity changes after freezing require review; before freezing current identity is independently resolved.

Clerk errors/rate limits are retryable, with sanitized codes and no cached/guessed email fallback. Missing/unverified/conflicting identity is non-sendable. No email lookup, identity rebinding, account merge, workspace membership or access grant occurs.

Known destination suppressions block capture; unknown active lookup-key versions block all captures in that provider scope pending review. The key version is derived from the configured high-entropy digest key, so changing that key cannot silently make old suppressions disappear. This release fails closed rather than implementing production key-rotation migration. More than 1,000 active scope suppressions also requires review; this bounded development fallback is not a production suppression lookup design.

## Database-enforced invariants

- Scope and exact source-pointer combinations are closed. Every declared tenant reference must exist and match the source workspace, including reversal → receipt and platform audit → resource checks. Nulls cannot bypass validation.
- Source identity/policy/effective-time references are immutable; an initially absent archive/cancel event may only attach consistently. Historical/audit dispositions cannot be activated through a state edit.
- Canonical source and intent keys are checked in SQL. A template version is not a new intent. Logical key/generation uniqueness and a partial actionable-generation index prevent duplicate live generations. Reviewed replacements are intentionally unavailable in N-B.
- Outbox/notice source identities match. Attempt provider scope/key/hash must match its parent through a restrictive compound FK; keys are reusable between attempts of the same frozen generation.
- Frozen identity/payload evidence and completed attempts cannot be rewritten. Provider event identity/digest is immutable; optional evidence association requires matching scope/message/destination, and APPLIED needs complete evidence fields. No handler creates genuine evidence in N-B.
- Positive counters, lease pairs, bounded JSON/cipher fields and sub-24-hour safe retry limits are enforced. Partial indexes cover actionable queues, abandoned claims, unresolved sources/provider evidence and notice review.
- Required notices remain OPEN or REVIEW_REQUIRED. Capture, a provider-like fixture, an accepted message or a control setting cannot mark an obligation legally satisfied or fabricate manual resolution.
- Controls cannot set `enabled=true`; settings accept no arbitrary payload, credential, template or destination. Foreign keys are restrictive; no notification cascade removes users, business records or legal evidence.

These are application/database constraints, not protection against a privileged database owner replacing schema or destroying records. No notification retention cleanup or tenant purge is implemented.

## Configuration and invocation

All controls default off. This release has no deployment-enable command.

| Configuration | Meaning |
| --- | --- |
| `COREOPS_NOTIFICATIONS_CAPTURE_ENABLED=true` | Required even for capture dry-run; otherwise the machine service fails closed |
| `COREOPS_NOTIFICATIONS_SEND_ENABLED` | If exactly `true`, reject operation; no external sending implementation exists |
| `DATABASE_URL` | Must be loopback and named `coreops_auth_rehearsal_notifications_*` |
| `VERCEL` / `VERCEL_ENV` | Either present/nonempty rejects operation; preview/production cannot run this release |
| `COREOPS_NOTIFICATION_DIGEST_KEY` | Server-only canonical Base64 32-byte key; tests generate it in-process |
| `COREOPS_NOTIFICATION_TEST_USER_IDS` | Explicit comma-separated local test-user IDs, capped at 100; absent/nonmatching users are not resolved or captured |
| `COREOPS_NOTIFICATION_HISTORY_CUTOVER_AT` | Explicit UTC cutover; missing/invalid value sends every discovered source to historical review |
| `CRON_SECRET` | Server-only bearer secret, at least 32 characters; constant-time comparison on every HTTP request |
| Database GLOBAL / `kind:<closed-kind>` controls | Separate `captureEnabled` flags and optional pause; actual `enabled` remains false |

`GET /api/notifications/capture` is permitted only on the configured central host (or existing path-mode host policy). It bypasses interactive Clerk only to enforce its own secret, host and rehearsal checks. Apex/tenant/POST requests fail in subdomain mode. Responses are private/no-store. `dryRun=true` is the default and writes no source, outbox or run records. `limit` defaults to 10, range 1–25; direct source discovery is bounded to 100, with five records per adapter visit. Identity lookups have a four-second timeout; work admission uses an approximately 18-second budget and leaves excess work for later invocation. Lease coordination, not a platform scheduler, ensures claim correctness.

No `vercel.json` schedule, worker deployment, real credentials, provider domain, callback endpoint or email account was configured. Internal capture-control administration requires existing SUPER_ADMIN/recent MFA and transactional role rechecks, committing an existing PlatformAuditEvent. No generic email-send API exists.

## Migration rehearsal and preservation

No normal local, preview or production database was migrated. Normal `core_ops_db` still has its original **13 completed migrations**. No `.env` or external configuration was edited. Existing protected backups were neither overwritten nor deleted.

| Isolated database | Evidence |
| --- | --- |
| `coreops_auth_rehearsal_notifications_20261109` | Initial empty-chain rehearsal and development constraint/worker tests; forward fixes rehearsed without rewriting applied history |
| `coreops_auth_rehearsal_notifications_chain_20261110` | Complete final chain from empty; final notification tests and existing B/auth/commercial/identity/payment/proxy regressions; Prisma diff reports **No difference detected** |
| `coreops_auth_rehearsal_notifications_populated_20261109` | Clone of the isolated populated C rehearsal; all **29 existing-table fingerprints / 41 records preserved** |
| `coreops_auth_rehearsal_notifications_populated_extended_2026111` | PostgreSQL's actual truncated name for the initially longer test name. Separate C clone with added synthetic payment, reversal, lifecycle, export/recovery and legal fixtures **before** N-B migration; all **29 fingerprints / 62 records preserved** |

The extended fixture includes immutable quote/period/receipt/reversal evidence, lifecycle events/journal, a recovery request, READY artifact ciphertext/token-hash fields, an account-level legal receipt, and existing operational/assignment records. Fingerprints compare complete stored rows, not just counts. No lifecycle/source/outbox backfill is a migration effect. Synthetic preservation fixtures remain only in these isolated review databases; integration fixtures clean up their own dependency chains.

Rehearsal corrections: the first SQL function declared an unused record variable that shadowed an event-query alias; integration tests caught it and a forward migration corrected it. Export fixtures were corrected to satisfy C's existing hash constraints. Safeguards were retained. A final permission-review timeout prevented one test command from starting; the permitted retry completed successfully.

## Verification results

| Check | Actual result / boundary |
| --- | --- |
| Notification integration | **26 passing Node tests including parent container**, zero failures; real PostgreSQL, controlled Clerk/time/interruption boundaries |
| Existing B/lifecycle/authorization/commercial/identity/payment/proxy suite | **87 passed including containers**, zero failures, against the final empty-chain rehearsal |
| C export/recovery suite | **18 passed including container**, zero failures, against its dedicated isolated `coreops_auth_rehearsal_exports_20261109`; C tables/services and TTL unchanged |
| Updated Proxy program | **10 passed**; capture route included in central-only/Clerk-bypass assertions |
| Navigation / host / lifecycle-policy / auth-configuration / export-format | **4 / 9 / 3 / 3 / 1 passed** |
| Prisma validation, generation, full-chain migration and diff | Passed; raw SQL guards additionally exercised by integration tests |
| TypeScript | Passed |
| Focused N-B ESLint | Passed, no errors/warnings |
| Full ESLint | No errors; 12 pre-existing unused-import warnings in business pages |
| Production build | Passed locally; no deployment |
| Actual built HTTP endpoint | **5 loopback checks passed**: missing/wrong bearer and forged context, private read-only capture without Clerk redirect, invalid bounds and POST denial; database counts unchanged and temporary server stopped |
| Signed-in browser / provider / real inbox | **Not performed.** No authentication/MFA/browser or deliverability claim |

Integration scenarios cover duplicate/concurrent discovery and fanout; multiple roles/kinds; missing owners; old and late commits; scoped pointers/null cases; notice/attempt/provider mismatch; frozen evidence; capture interruption and stale leases; role loss before/during processing; Clerk 429/unverified identity; test-user allowlist; suppression/key rotation; TTL and claimant scope; required/missed notice blockers; actual-provider UNKNOWN quarantine; domain-state preservation and sanitized runs.

A synthetic 1,000-event backlog exercise measured ten bounded anti-join queries and retained the actual EXPLAIN ANALYZE plan in the test log. The local median/p95 were approximately 0.98/1.23 ms in the observed run; EXPLAIN used index-only scans on the event primary key and unique source event index under a bounded merge anti-join. The actual chosen plan is retained in `/tmp/workflowconnect-nb-tests.log`; a discovery bound of 25 remained respected (15 sources discovered). Timings vary between local runs. This is a small loopback sample with synthetic data and a substituted identity provider, **not production load or latency acceptance**. Capture tests do not measure email-provider throughput, network latency, global rate enforcement or deliverability.

Reproduction (never point tests at the application database):

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_chain_20261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/notifications.integration.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_chain_20261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/lifecycle.integration.cjs \
  tests/authorization.integration.cjs tests/commercial.integration.cjs \
  tests/identity.integration.cjs tests/paystack-vat.integration.cjs tests/proxy.test.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/data-access.integration.cjs
npm run typecheck
npm run lint
npm run build
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_chain_20261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/notifications-http-smoke.cjs
```

Local evidence: `/tmp/workflowconnect-nb-{tests,final-regressions,exports,proxy,navigation,host,policy,auth,format-tests,types,lint,lint-focused,validate,build,http,complete-chain,final-drift,preservation,extended-preservation}.log` and protected fingerprint JSON files. These are temporary local records; preserve needed evidence durably before rollout.

## History cutover and restore quarantine

1. Before any future sending release, independently approve the exact target, historical policy, sender/provider scope, approved kinds/templates, recipient rules and notice evidence. N-B does not authorize them.
2. Keep external sending off while gap reconciliation inventories old committed facts. Review aggregate dispositions/required obligations. Do not move a cutover backward to bulk-email historical data or mutate HISTORICAL_REVIEW rows to PENDING. Required old notice gaps remain unresolved.
3. Approve a specific UTC cutover for newly effective facts. Preserve canonical source keys, prior generations, provider keys/message identities, attempts and suppressions across deployments. A template change is not a resend authorization. Old unknown attempts need reconciliation, not automatic replacement.
4. Every restored database must remain quarantined from future sending until its provider-message/idempotency/suppression history is reconciled against independent provider/dedup evidence and an authorized instance-specific admission is recorded. A restorable environment flag or database-local queue alone is insufficient.
5. N-B enforces quarantine by having **no external transport**, rejecting Vercel/non-rehearsal operation and refusing to process restored provider attempts as captures. The future independent restore-attestation/reconciliation mechanism is **not implemented** here and remains a launch gate for N-C/N-D.

No pre-journal backup/provider-ledger restore drill or real callback reconciliation was performed in N-B. Capture replay tests prove stable local capture identity, not exactly-once external email delivery. Future genuine sending must also account for provider idempotency expiry and unknown outcomes.

## Outstanding decisions and next review

- Separately approve N-C/N-D before real Resend integration, authenticated webhooks, provider reconciliation, live controls, sender DNS, delivery evidence or administrative delivery UI.
- Approve transactional templates, source-history cutover, recipient and required-notice evidence/lead-time policies, retention schedules, suppressions/review procedures and lawful alternatives. Captures never resolve these obligations.
- Implement shared provider rate permits, urgent/standard lane fairness, operational alerts, provider callbacks and realistic multi-instance/load testing in the genuine delivery release. N-B uses capture-only coordination; provider transport throughput is not implemented.
- Review bounded suppression lookup/key migration and recipient caps for production volume. Unknown keys and excessive counts fail closed today.
- Complete real Clerk test-instance/browser/MFA, provider/inbox, production-style host and deployed runtime acceptance separately. Mocked boundaries do not establish these.
- Invitation tokens, app-owned account-security operations, membership subject capture and incident producers need separate contracts. N-X storage/authorization/24-hour export work remains separate; C stays 15 minutes.
- Notifications do not approve live B day-60 enforcement, production migration, deletion, anonymization or purge. Existing export/recovery, lawful exceptions, independent deletion ledger/restore and customer-notification rollout gates remain.

**Stop here for N-B review. No email has been sent and no provider, Cron, preview/production database or deployment was changed.**
