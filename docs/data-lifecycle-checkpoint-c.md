# Data lifecycle — Checkpoint C implementation and acceptance

9 November 2026. **Secure export/recovery implemented and tested in isolated development. Real signed-in browser acceptance remains pending. No production/preview migration, deployment, live lifecycle enforcement or Checkpoint D work occurred.**

The owner's C approval accepts [Checkpoint B](data-lifecycle-checkpoint-b.md) and authorizes secure exports, reviewed recovery and integration with existing paid activation. B's rehearsal-only gate remains unchanged. No customer business records were deleted or anonymized. Cleanup below concerns temporary export ciphertext, not customer operational data.

## 1. Files and migration

| Files | Change |
| --- | --- |
| [Prisma schema](../prisma/schema.prisma), [20261109000300_secure_export_recovery](../prisma/migrations/20261109000300_secure_export_recovery/migration.sql) | Export/recovery request models and states; identity/review/grant snapshots; encrypted artifact storage; same-tenant FKs; idempotency and one-open-export/one-pending-claim indexes; deadline/artifact checks and immutable request/review snapshots. Additive only, no backfill. |
| [security](../src/server/data-access/security.ts), [grants](../src/server/data-access/grants.ts), [events](../src/server/data-access/events.ts) | Rehearsal feature/encryption configuration, live identity plus strict MFA, current identity-binding checks, scoped expiring grants and content-free atomic events. |
| [exports](../src/server/data-access/exports.ts), [content inventory](../src/server/data-access/export-content.ts), [ZIP/CSV](../src/server/data-access/zip.ts) | Request/status, bounded generation, database encryption, single-use authorization, cleanup and future purge-interlock contract. |
| [recovery](../src/server/data-access/recovery.ts), [restore integration](../src/server/data-access/restore.ts) | Independent review, evidence references, approval/rejection/revocation/expiry, and grant consumption only in funded activation. |
| [download handler](../src/server/data-access/download-handler.ts), [central POST route](../src/app/account/data/exports/[id]/download/route.ts) | Fresh authorization, strict Origin, bounded body, private ZIP response, streamed download lease and timeout. |
| [cleanup handler](../src/server/data-access/cleanup-handler.ts), [cleanup route](../src/app/api/lifecycle/export-cleanup/route.ts), [routing policy](../src/lib/routing/request-plan.ts) | Exact central machine GET authenticated with existing cron-secret convention. No schedule enabled. |
| [account data page](../src/app/account/data/page.tsx), [Server Action](../src/app/account/data/actions.ts), [client form](../src/components/data-access/DataForm.tsx) | Central request/recovery/status UI, supported Clerk reverification modal, private download and browser object-URL cleanup. |
| [platform review page](../src/app/platform/(protected)/recovery/page.tsx), [platform layout](../src/app/platform/(protected)/layout.tsx), [requests](../src/app/platform/(protected)/requests/page.tsx), [actions](../src/app/platform/(protected)/actions.ts) | SUPER_ADMIN recovery queue and explicit optional recovery reference on existing paid activation. |
| [account settings](../src/app/account/[[...account]]/page.tsx), [tenant layout](../src/app/w/[workspaceSlug]/layout.tsx) | Central export/recovery navigation, including archived/canceled owner context. Links are hidden when the rehearsal feature is disabled. |
| [lifecycle service](../src/server/lifecycle/service.ts), [commercial service](../src/server/commercial/service.ts) | Optional reviewed recovery guard, verified grant-owner selection, transactional restore; persisted cancellation deadline remains authoritative for retention expiry. Ordinary activation still cannot bypass canceled state in enforcement-enabled rehearsals. |
| [C integration tests](../tests/data-access.integration.cjs), [independent format test](../tests/export-format.test.cjs), [B lifecycle tests](../tests/lifecycle.integration.cjs), [proxy tests](../tests/proxy.test.cjs), [HTTP smoke](../tests/lifecycle-http-smoke.cjs), [package scripts](../package.json) | Security, concurrency, bounded output and regressions; B envelope assertions now also require its new optional C references to be null. |
| [Notification contract](data-access-notification-contract.md), this report, B follow-up | Review evidence and remaining gates. |

Existing Clerk-readiness working-tree changes are preserved, not attributed to C. Existing legal documents, `.env`, Vercel/Neon/Clerk configuration, live accounts and historical migrations were not changed.

## 2. Export schema and contents

ZIP format `workspace-export-v1`, UTF-8; `export.json`, seven CSV files and `README.txt`. Exact Decimal amounts are JSON strings and exact digit strings in CSV. Dates are UTC ISO-8601; JSON null becomes an empty CSV cell. Identifiers preserve relationships without exposing global authentication identifiers.

| Dataset | Included |
| --- | --- |
| Workspace | ID, business name, slug, creation timestamp |
| Clients | ID, name/company, email, phone, status, created/updated timestamps |
| Projects | ID, client ID, name/description, status, exact budget, deadline, timestamps |
| Project assignments | Assignment ID, project ID, workspace membership ID, creation time |
| Tasks | ID, project/assigned membership IDs, title/description, status, priority, team visibility, due date, timestamps |
| Customer invoices | ID, invoice number, client/project IDs, status, exact amount, due date, timestamps |
| Minimized members | Workspace membership ID, display name, role and status; includes inactive members where needed to preserve assignment interpretation |

Excluded: other tenants, global User/Clerk IDs, member email/job title, invitation data/tokens, authentication/session/recovery secrets, legal receipts, internal tenant/platform audit contents, subscription quotes/payments, Paystack/provider records and credentials. Export request/transition history remains separately protected audit evidence. No attachment feature exists, so no attachment export is claimed. Operational invoices are exported as the existing tracker records, not represented as approved statutory tax invoices.

CSV formula-like cells beginning with `=`, `+`, `-`, `@`, tabs/newlines or relevant leading whitespace/control characters receive an apostrophe prefix; quotes/newlines follow quoted CSV encoding. JSON preserves original values. Independent Python `zipfile` CRC and CSV readers validate the generated format, including UTF-8 and quoted multiline text.

All application business/assignment mutations already serialize on Workspace. Generation takes that same row lock and performs bounded preflight plus selective reads in one transaction, yielding consistent application-controlled relationships. It does not hold the workspace lock during network delivery. Direct privileged database writes are outside this application locking boundary.

## 3. Identity, authorization and step-up

Every request/preparation/download requires central-host context, the existing live Clerk session check, a verified primary email, unchanged external-ID binding and current database authority. Sensitive operations also require enrolled MFA, evidence of both actual factors and Clerk `strict_mfa` reverification. The supported `reverificationError` / `useReverification` flow prompts on stale verification. Missing MFA does not fall back to first factor or email-only recovery.

The installed `@clerk/nextjs` **7.5.18** exports were inspected before using these APIs, and checked against the [official Clerk reverification guide](https://clerk.com/docs/guides/secure/reverification). This confirms API support, not successful real-session acceptance.

Normal export authority is an ACTIVE OWNER membership in an operationally ACTIVE workspace with paid history, during active/grace/archive access. Canceled access requires an explicit reviewed export grant even for a still-listed Owner. A lost/suspended member can use a separately reviewed grant without regaining ordinary membership. Manually suspended, closed or pending workspaces remain blocked by independent restrictions. Retention-expired requests cannot obtain new export/recovery approval under an invented extension policy.

STAFF/MANAGER and platform status alone never grant full export. All IDs are selectors, not authority. API and Server Action calls independently enforce the same server checks. Tenant-host compiled actions cannot invoke the central flow successfully.

Download uses same-origin POST with a maximum 2 KiB form body; token is never in the URL. Its hash is stored, the token is bound to export and requester, and fresh authorization is required even with a valid token. Consumption is atomic and one-use; retries cannot replay the response. The client refuses redirects or non-ZIP success bodies, avoiding saving a sign-in page as an export.

Revocation/ownership change committed before download authorization blocks access. Already authorized bytes released in a response cannot be recalled. Responses are short and bounded; there are no public permanent URLs or resumable/range capabilities. This timing limit is explicit, not a claim of instantaneous revocation of bytes already sent.

## 4. Recovery and paid reactivation

Claim submission records an idempotent support/evidence reference and snapshots the claimant's verified external ID and email hash. Knowing a workspace ID or holding a former membership grants no access. Claimants can be a different verified identity; no old User binding or workspace membership is transferred.

SUPER_ADMIN, current platform MFA and transactional active-role rechecks are required for decisions. The claimant cannot review their own case. Approval requires:

- Independent live Clerk target identity verification, including current verified primary email and non-banned/non-locked account.
- Explicit reviewer attestation of current business authority/historical ownership as applicable, protected evidence references and a bounded audit reason.
- Specific export and/or reactivation-consideration scopes, with an explicit 1–60-minute expiry.

Evidence inspection is a manual protected support process; the app does not validate uploaded identity documents or automate legal/business ownership decisions. No documents are uploaded in this implementation. The request records reviewer, reason, references, identity/authority verification times, grant deadline and subsequent revocation/consumption.

Unverifiable/stale cases can be rejected without pretending identity was verified; their `identityCheckedAt` remains null. Expiry is enforced at use even if cleanup is late. Revocation invalidates dependent unused artifacts immediately under the workspace lock.

For post-cancellation activation, SUPER_ADMIN supplies the grant ID to the existing commercial activation action. That path still requires approved quotation, accepted quote, independent verified funds, capacity/plan checks, current verified active Owner and fresh transactional lifecycle/grant checks. Approval alone changes neither subscription access nor membership. Concurrent activation retries create one period and consume the grant once; restore history is committed with paid activation.

**Lost/suspended ownership:** reviewed export is implemented without restoring membership. Reactivation still needs a valid ACTIVE Owner; a grant does not silently promote/reactivate a claimant or merge identities. If no valid Owner remains, a separately approved verified membership-restoration procedure is required. Do not work around this with direct database rebinding or a generic platform role-assignment action.

## 5. Limits, encrypted storage, cleanup and concurrency

| Control | Implemented bound |
| --- | --- |
| Source inventory | At most 5,000 rows per entity table, 20,000 total, 4 MiB serialized source preflight including member display names/workspace text |
| ZIP | 8 MiB maximum, stored ZIP format; no partial archive on overflow |
| Generation | One database-wide advisory admission slot; one open export per workspace; 2-second SQL statement timeout, elapsed-generation check at six seconds, eight-second transaction timeout |
| New requests | At most five exports and five recovery submissions per verified user per hour, serialized on User; unique idempotency key/payload matching; one pending claim per workspace/requester |
| Download authorization | 15-minute request/artifact TTL, single-use token, current identity/authority rechecked |
| Delivery | At most four database-backed download leases; 64 KiB copied chunks, 25-second response timer, 30-second route budget; conservative 60-second crash lease |
| Cleanup | Bounded candidate sets, workspace locks, three-second transaction timeout and approximately 18-second admission budget; interrupted/failed cleanup is retryable |

Ciphertext lives in PostgreSQL ByteA only, AES-256-GCM with a fresh nonce and export-ID authenticated data. A server-only 32-byte root key derives separate encryption and HMAC keys using native HKDF. Download authorization uses a context-bound HMAC token; only its hash is stored. The artifact digest is SHA-256 over ZIP bytes. No archive is written to a web directory, filesystem, object store or permanent public location.

Ciphertext/token hash is cleared on consumption, expiry, generation failure or dependent grant revocation. Generation admission contention leaves the same pending request retryable, without consuming another hourly request. Metadata/events remain for audit; their retention requires the later approved schedule. Browser blob URLs are revoked after download dispatch. Key rotation invalidates pending artifacts/tokens rather than falling back to plaintext or an old identity.

Expired authorization fails even if physical cleanup has not run. `GET /api/lifecycle/export-cleanup` uses a strong `CRON_SECRET` bearer, independent central-host enforcement and the rehearsal feature gate. No deployed schedule is configured. **Fifteen minutes is an authorization TTL, not a claim that an unconfigured scheduler physically removes ciphertext at that exact instant.**

`hasActiveExport` is the future purge interlock: Checkpoint D must acquire the same Workspace lock and check requested/ready operations plus generation/delivery leases before every destructive batch. C does not add a purge implementation. WAL/backups may retain ciphertext after clearing ByteA; backup expiration, key handling and restore reconciliation remain unverified D/provider decisions.

A 1,001-client fixture exports successfully. A 5,001-client fixture fails safely, without partial artifacts. This is not a production load/memory benchmark. Workspaces beyond these caps need separately reviewed private object storage/worker infrastructure or measured adjusted limits. No external infrastructure was configured; oversized exports remain a launch blocker if expected customer volumes exceed the tested contract.

## 6. Notification integration

See the [notification event/consumer contract](data-access-notification-contract.md). Export requested/ready/failed, recovery requested/approved/rejected/revoked/expired and workspace restored are durable, content-free events with stable IDs/operation keys, committed atomically with their state changes.

No outbox consumer/provider/delivery record exists. Ready/approved/download-authorized is not delivered. A future service must deduplicate by event ID and recipient/channel, reconcile commit-order gaps, recheck current authority/expiry, and link to central authenticated UI rather than sending ZIP files or token URLs.

## 7. Migration rehearsal and preservation

| Target | Result |
| --- | --- |
| `coreops_auth_rehearsal_exports_20261109` | New empty database; full chain including C applied successfully. Dedicated disposable integration fixtures cleaned up after each suite. |
| `coreops_auth_rehearsal_lifecycle_populated_c_20261109` | Clone of the isolated B populated rehearsal; C migration applied successfully; all 13 pre-migration operational/commercial/identity/assignment table fingerprints matched the protected pre-existing fixture evidence. No lifecycle state/events backfilled. |
| Prisma schema comparison | **No difference detected**, pinned Prisma 7.8. Raw checks/immutability/tenant constraints additionally exercised in tests. |
| Shared/normal development, preview, production | Not migrated or modified. No enforcement flags, keys, schedules or provider settings written to `.env` or remote configuration. |

Existing B backups were retained; no archive was deleted or overwritten. The populated rehearsal clone remains isolated review evidence and contains synthetic test data plus the restored local baseline. No live customer dataset was used for export tests.

## 8. Verification and practical limits

| Check | Result |
| --- | --- |
| New data-access integration suite | **18 passed including parent container**, zero failures: 17 scenarios covering exports, role/tenant denial, live-identity boundary, actual factor checks, ownership loss, reviewed identity changes, foreign/revoked/expired grants, single-use tokens, CSRF/body bounds, confidentiality, limits, partial/time failures, ciphertext cleanup, retryable generation admission, download leases, simultaneous three-way lock contention and funded recovery activation |
| Existing lifecycle + authorization + commercial + identity + payment + proxy regression suites | **87 passed including parent containers**, zero failures |
| Focused proxy rerun | **10 passed**; both machine routes tested on central/apex/tenant hosts and with POST denial |
| Independent ZIP/CSV reader | **1 passed** using Python ZIP CRC and CSV parsing, not just a parser mirroring the writer |
| Navigation / host policy / lifecycle policy | **4 / 9 / 3 passed** |
| Clerk/legal configuration safeguards | **3 passed**; no registration gate weakened |
| Prisma validation / schema diff | Passed; no drift |
| TypeScript | Passed |
| Full ESLint | Zero errors; 12 pre-existing unused-import warnings in business pages |
| Production build | Passed locally, including new account/recovery/download/cleanup routes; no deployment |
| Built loopback HTTP smoke | **7 checks passed** for machine-route authentication, Clerk bypass, disabled processing/cleanup, private dry-run and POST denial. Temporary server stopped; no state changes. This is not an authenticated download test. |

PostgreSQL, encryption, ZIP bytes, FK/immutability checks and locks are real. Clerk sessions/profiles/MFA/provider responses, Next request context and controlled clocks are substituted in integration tests. A test uses actual PostgreSQL blocked-process detection for simultaneous preparation, recovery review and cancellation. Generation timeout/partial failure cases deliberately inject controlled faults; they are not Vercel timeout/load certification.

The additional admission-lock test required casting PostgreSQL's `void` lock result to a Prisma-supported text type; this was a test-only correction. Review also corrected CSV Decimal formatting, stale-case rejection and persisted-retention-deadline handling. No security assertions were removed to obtain passing results.

### Manual browser acceptance

**Not completed.** Browser inventory showed available browser surfaces but no open authenticated test session. A disposable MFA account/interactive sign-in was requested; no credentials were supplied or invented. No real administrator was bootstrapped.

Still verify through the isolated signed-in browser: current/archived Owner request and download, opening the actual ZIP, stale MFA prompt/retry, revoked session recovery, role/tenant denial and RSC payload inspection, canceled historical-owner review, grant revocation while downloading, identity-change errors and approved funded restoration. Real Clerk claims, framework Server Action CSRF, HTTPS headers, browser download behavior and platform MFA recovery remain unverified until that pass. Backend tests are not substitutes for it.

Reproduction (the runner refuses non-loopback/non-rehearsal targets):

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/data-access.integration.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_20261109 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/lifecycle.integration.cjs \
  tests/authorization.integration.cjs tests/commercial.integration.cjs \
  tests/identity.integration.cjs tests/paystack-vat.integration.cjs tests/proxy.test.cjs
npm run test:export-format
npm run test:navigation
npm run test:host-policy
npm run test:lifecycle-policy
npm run test:auth-configuration
npm run typecheck
npm run lint
npm run build
```

Temporary evidence: `/tmp/workflowconnect-c-{integration,regressions,proxy,format-test,navigation,host,policy,auth-config,types,lint,build,drift,preservation,fresh-migrate,populated-migrate,http}.log`. Preserve required evidence securely before relying on it for rollout; `/tmp` is not durable audit storage.

## 9. Configuration and remaining production blockers

- New `COREOPS_SECURE_EXPORTS_ENABLED` defaults off and requires B's unchanged loopback rehearsal enforcement gate. Deployed Vercel environments cannot enable it through flags alone.
- `COREOPS_EXPORT_ENCRYPTION_KEY` must be canonical base64 for 32 random bytes in server-only secret storage. Never use a public-prefixed variable, commit it, print it in diagnostics or share it in chat. Tests generate keys inside their process only. Production secret provisioning/rotation/retention requires separate review.
- Existing `CRON_SECRET` authenticates cleanup; no recurring cleanup invocation was enabled. Approve monitoring, schedules, failure recovery and privacy-safe retention before operational use.
- Approve real Clerk MFA/enrollment/recovery and current/historical ownership evidence procedures. No email-only or administrator bypass exists. Any full membership-restoration/account-linking procedure requires explicit verified policy; grants alone do not implement it.
- Approve capacity beyond current export limits if representative workspaces require it. Options for review are a private encrypted artifact store plus bounded worker, or measured larger database/function bounds; neither has been configured.
- Notification delivery, legal-document approval, data-processing disclosures, financial/legal retention, export-history retention, provider backup handling and deletion-ledger reconciliation remain separate launch gates. C does not authorize D, deletion or live day-60 enforcement.
- The wider [launch-readiness findings](launch-readiness.md) still apply, including unrelated business invoice validation/idempotency and financial reporting definitions.

### Review boundary

Review the implemented C security model, export schema/limits, identity evidence procedure and remaining manual acceptance before authorizing Checkpoint D. Keep all deployed lifecycle/export processing disabled. No production/preview migration, live payment, administrator bootstrap, customer email, account merge or destructive cleanup was performed.
