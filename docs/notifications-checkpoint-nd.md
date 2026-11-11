# Notification service — Checkpoint N-D engineering report

10 November 2026. **Isolated engineering implementation; stop for review. External delivery and deployment remain blocked.** This follows [N-C](notifications-checkpoint-nc.md) and its unchanged N-A/B and lifecycle B/C contracts. N-X, customer sending and production lifecycle enforcement are not authorized.

## Implementation and migration

| Files | Actual change |
| --- | --- |
| `src/server/notifications/resend/{release,local-transport,adapter}.ts` | Official Resend REST request/response adapter implementing the existing `NotificationProvider` interface; a numeric-loopback HTTP transport is its only admitted transport. No Resend SDK/SMTP/global-fetch fallback or real endpoint is available. |
| `resend/{envelope,retry-policy}.ts` | Frozen reply-to and correlation tags, body/destination binding, normalized failures, conservative 23-hour retry decisions and no idempotency-key lookup invention. |
| `resend/webhook.ts`, `src/app/api/notifications/resend/webhook/route.ts` | Genuine Svix raw-byte verifier, bounded durable inbox and authenticated evidence association on exact central POST `/api/notifications/resend/webhook`. Isolated only; deployed requests fail closed. |
| `resend/restore-ledger.ts` | Bounded HMAC-chained fsync local witness fixture and stale-snapshot admission tests. Production witness creation always throws. |
| `src/server/notifications/efficient-scheduler.ts` | One-intention wake-driven coordinator; persisted next permit/wake deadline, short fenced coordinator lease and cheap early deferral. No timer, Cron or deployed worker. |
| `simulation-worker.ts` | HTTP-mock frozen generations cannot enter the existing concrete fake-provider dispatch path. Existing N-C behavior otherwise preserved. |
| `simulation-admin.ts`, `src/app/platform/(protected)/notifications/page.tsx` | Existing role-filtered lag, failure, callback and uncertainty review extended with signed HTTP-mock counts and explicit unverified account/domain health. No new transport or evidence override control. |
| `prisma/schema.prisma`, `20261110000700_resend_engineering/migration.sql` | Two additive discriminators (`engineeringTransport`, `evidenceProtocol`), immutable protocol/transport guards, mock UUID mapping and fenced coordinator lease support. Existing actual-transport prohibition remains. No historical source backfill, replay or data relabeling. |
| `src/lib/routing/request-plan.ts`, `tests/proxy.test.cjs` | Exact central webhook POST bypasses interactive Clerk; tenant/apex/other-method paths denied. Handler independently enforces release/host/signature. |
| `tests/notification-resend.integration.cjs`, `tests/notification-resend-http-smoke.cjs`, `scripts/build-notification-benchmark.cjs` | Local HTTP/Svix, PostgreSQL, built-worker workload and production-bundle disabled-endpoint checks. |
| `tests/notification-simulation.integration.cjs`, `scripts/notification-nc-preservation.cjs` | Extend strictly loopback named-rehearsal guards to N-D names, retaining N-C eligibility. No relaxed normal/remote database access. |
| `package.json`, lockfile | Pinned `svix@2.10.0` (requires Node 22+), development-only `esbuild@0.28.2`; N-D test and benchmark-build scripts. Lock changes include esbuild's platform optional binaries. |
| This report, [sender/operations/restore preparation](notifications-production-preparation.md), [26 template proposals](notifications-production-template-proposals.md) | Review material and separate disposable-inbox checklist; no template publication or external configuration. |

Existing uncommitted lifecycle, export/recovery, Clerk and earlier notification work remains in place. Applied migration history was not edited. The new migration was finalized before its first isolated application; no forward correction was needed after application. No `.env` or legal document was changed.

## Provider contract and release barrier

Verified against the official [send API](https://resend.com/docs/api-reference/emails/send-email), [retrieval API](https://resend.com/docs/api-reference/emails/retrieve-email), [idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys), [webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests) and installed Svix 2.10 behavior. These establish request/verifier compatibility in fixtures, not actual account acceptance.

The adapter makes one POST `/emails` with exact frozen sender, single recipient, subject, HTML/text, reply_to and three frozen correlation tags. It preserves `Idempotency-Key` and JSON bytes between retries. There are no SDK hidden retries. Only a valid UUID in a 2xx JSON response means provider acceptance; it never means mailbox delivery. 401/403 classify authentication failure, 400/422 validation, 404 configuration; 429 honors Retry-After seconds/date or rate-reset fallback. 409/5xx/redirects, malformed success, connection failure and explicit timeout remain UNKNOWN. Responses are capped at 64 KiB and timeouts at five seconds. Long retry deadlines are parked for review rather than sent before provider permission or after the local safe window.

Known-message retrieval requires UUID, exact sender/recipient/subject matching and does not change delivery evidence automatically. No verified Resend API lookup by idempotency key is supplied: `lookup(key)` throws. Absence of a mapped message is never proof that a request was unsent. UNKNOWN goes to reconciliation, never an administrator force-send action. Acceptance remains a fact even after authority becomes stale; further attempts require current authorization in the existing worker policies.

**External sending is technically unavailable in this release:** `createLiveResendTransport()` always throws; the adapter accepts only `LocalResendMockTransport`, numeric `http://127.0.0.1:<port>`, fixed provider paths, no redirects/DNS/HTTPS forwarding, dummy test authorization and `.test` recipients/links. Engineering additionally requires existing simulation/capture gates, no Vercel environment, exact loopback `coreops_auth_rehearsal_notifications_nd_*` database and explicit test-user allowlist. Ordinary Resend credentials/environment changes cannot enable a real endpoint. An actual domain-worker transport rollout and independently durable admission require a separately reviewed code/release change. N-C's production-like fake dispatcher is not silently rewired to a genuine provider.

## Genuine webhook compatibility, simulated evidence

Svix verifies the exact raw bytes and required `svix-id`, `svix-timestamp`, `svix-signature` headers with its five-minute tolerance. The installed verifier returns void; JSON is parsed only after successful verification. The handler bounds streaming and declared payloads to 64 KiB and uses a 30-second route budget. Secrets are ephemeral test keys, never production keys. The configured scope/secret is server-bound; neither request Host, arbitrary tags nor a provider-account header chooses authority.

Authenticated scope/event ID is unique. An advisory transaction lock deduplicates concurrent receipts; identical replay returns existing disposition, digest/protocol conflict quarantines original evidence without rewriting its digest or weakening a delivery fact. Authenticated malformed/unknown/unmatched events are durably quarantined with bounded metadata and hashes; no raw email content is retained. Authentication failures return generic 400; persistence failure returns retryable 503. A 202 occurs only after database commit.

Association requires the frozen generation, account binding and HMAC correlation proof, exact sender/single destination, identity-key version, dispatch time and matching UUID `data.email_id`. RFC `message_id` is not used as the provider ID. Early callbacks can map before the API outcome is recorded because dispatch snapshots already exist. No “latest attempt” is guessed. Delivery, bounce and complaint timestamps are preserved separately and later weaker events cannot downgrade them. Bounce/complaint/suppressed evidence creates a destination suppression in the same transaction. Unknown/mismatched events do not manufacture association or acceptance.

All engineering rows remain **simulated=true** with `RESEND_HTTP_MOCK` / `RESEND_SVIX_MOCK` discriminators. SQL prevents protocol relabeling and synthetic evidence association with HTTP-mock generations. No fixture is converted into genuine delivery evidence. Required notices remain OPEN/REVIEW_REQUIRED, EXPORT_AVAILABLE is blocked pending N-X, and no callback activates a subscription or advances lifecycle enforcement.

This is real signature-library and REST-format engineering tested locally, not real Resend/Svix callback delivery, provider account/environment verification, live interoperability or inbox acceptance. Unknown/unmatched callback remediation remains manual review in this release; no live reconciliation service or public force-mapping action was introduced.

## Restore, sender and template preparation

The local witness records opaque intent/outcome/callback/suppression digests in a chained HMAC append log, fsyncs, rejects operation-key mismatch, and refuses a stale application manifest/checkpoint. Tests deliberately retain newer independent witness history while presenting an older application snapshot. N-C regression separately repeats its actual PostgreSQL backup/restore drill with an independent local fake-provider ledger.

This is **not** production restore admission: the local file shares a machine/trust boundary, is single-process/bounded, and cannot defeat privileged truncation/replacement or whole-environment loss. It is not wired as a production worker authority. [The proposed independent witness contract](notifications-production-preparation.md#independently-durable-restore-admission-design) requires separate durable ownership, immutable storage/key policy, external checkpoint authority, instance-bound revocable admission and reconciliation of provider, callback, UNKNOWN and suppression history. None is provisioned; production witness creation explicitly fails.

[All 26 closed kinds have proposed copy and source/recipient/deadline policies](notifications-production-template-proposals.md), versioned `PROPOSED-TRANSACTIONAL-v1`. They are review material; runtime HTTP mocks continue clearly simulated copy. Proposed sender is `WorkflowConnect <updates@notify.workflowconnect.io>`, reply-to `info@stravectsystems.com`, subject to provider/domain/mailbox approval. The [preparation runbook](notifications-production-preparation.md) covers DNS/IAM, rotation, quotas/billing ownership, monitoring/incidents and the separately approved disposable-inbox checklist. No actual DNS record values, secrets or account verification are invented. No inbound email automation exists.

## Migration and preservation evidence

| Target | Result |
| --- | --- |
| `coreops_auth_rehearsal_notifications_nd_261110` | Created empty, complete migration chain passed; final N-D functional tests and compiled-worker benchmark. |
| `coreops_auth_rehearsal_notifications_nd_reg_261110` | Separate empty-chain migration passed; sequential N-B/N-C and domain regression suites; Prisma diff: **No difference detected**. |
| `coreops_auth_rehearsal_notifications_nd_preserve_261110` | Clone of populated N-C rehearsal before N-D migration; all **39 pre-existing tables / 67 records** matched complete prior-column fingerprints after migration, including captured/lifecycle/export/recovery/financial evidence. No source/outbox backfill. |
| Normal local `core_ops_db` | Read-only confirmation: **13 completed migrations**, unchanged. Not migrated. Preview/production never connected or migrated. |

Only named isolated databases received schema/fixture writes. Cleanup uses fixture-owned workspaces/users/scope; test failures can retain disposable fixtures in the dedicated engineering database. No normal application customer cleanup was performed. Old backups and N-C restore copies remain intact. Protected fingerprint evidence is `/tmp/workflowconnect-nd-preservation.json`; temporary evidence is not durable rollout storage.

## Verification

| Check | Result and limit |
| --- | --- |
| Final N-D HTTP/Svix/PostgreSQL integration | **11 passed including parent container**, zero failures. Genuine verifier and real loopback HTTP/PostgreSQL; synthetic keys/addresses and substituted Clerk/request boundaries. |
| N-B capture regression on N-D schema | **26 passed including container**, zero failures. |
| N-C functional regression on N-D schema | **24 passed including container**, zero failures; includes identity/role/grant/expiry/suppression/concurrent-worker/crash/UNKNOWN, private role/MFA projections and actual isolated database restore. |
| Lifecycle/authorization/commercial/identity/payment/Proxy | **88 passed including containers**, zero failures; new exact webhook-host/method test included. |
| C export/recovery | **18 passed including container**, zero failures, dedicated isolated export database; 15-minute TTL unchanged. |
| Navigation / host / lifecycle policy / auth configuration / export format | **4 / 9 / 3 / 3 / 1 passed**. Auth inspector initially hit sandbox child-process EPERM; permitted local rerun passed. |
| Prisma validation/generation, fresh/populated migrations, drift | Passed; SQL guards also exercised by integration tests. |
| Typecheck / focused lint | Passed. |
| Full ESLint | Zero errors; **12 existing unused-import warnings** in business pages; no new N-D warnings. |
| Local production build | Passed; bundle includes the new webhook route. No deployment. |
| Built HTTP smoke | **7 loopback production-bundle checks passed**; capture remains private/read-only, Resend POST/GET disabled, counts unchanged and temporary server stopped. No signed-in/provider claim. |
| Real Clerk/MFA browser, Resend account, inbox, Neon/Vercel runtime | **Not performed / requires external confirmation**. |

Test setup corrections included retry-action assertion names, deployed-mode test cleanup and keeping bounce suppression evidence when exercising restore checks. The compiled harness initially bundled a test identity boundary and correctly hit an authentication redirect; externalizing that explicitly substituted boundary corrected the benchmark harness without weakening production authorization. New source code was not changed to bypass MFA/identity guards. Functional tests cover connection refusal, timeout, malformed responses, repeated body/key, mapped retrieval mismatch, stale/tampered signatures, duplicate/conflicting callbacks, wrong account/recipient/from, early mapping, monotonic bounce facts, protocol immutability, durable-before-ACK storage failure, default-off endpoint and coordinator fencing.

## Built-worker observations

The worker and dependencies are compiled with esbuild into `/tmp/workflowconnect-nd-worker.cjs`, Node 22.21.1, with explicitly substituted Clerk/request boundaries and no ts-node loaded in the compiled run. The scaffold also runs local HTTP/Svix fixtures; the measured 200-intention dispatch segment uses the existing independent local fake provider, not real Resend latency. No benchmark sends an email.

| Observation | N-D measured value |
| --- | --- |
| Accepted intentions | 200 |
| Coordinator ticks / deferred ticks | **200 / 0** |
| Elapsed / accepted throughput | **217.148 seconds / approximately 0.921 per second** |
| Observed peak RSS | **354.46 MiB**, sampled at tick completion, includes seed/mock/application scaffold; brief intra-tick peaks may be missed |
| CPU user / system | **23.329 / 1.822 seconds** |
| Shared provider budget | Existing one request/second; two slots preserved |
| Coordination | One wake-driven coordinator; contention/fencing tested separately; this is not N-C's 20-processor workload |
| DB connections, p95/inbox latency | Not sampled in this benchmark; no new connection/latency claim |

N-C's comparison was 200 accepted, 3,810 processor calls, 281.114 seconds, ~606 MiB RSS including ts-node and a different concurrency harness. The lower invocation count verifies this scheduler follows persisted permits instead of repeated expensive deferrals; memory/throughput differences are **not a controlled production capacity comparison**. Full-history admission remains expensive and bounded, generic Prisma pool settings are unchanged, and the benchmark is not deployment sizing. [Proposed cadence, six-connection worker ceiling and queue-lag targets](notifications-production-preparation.md#scheduling-and-initial-capacity-proposal) require implementation/review on the actual runtime. No Cron is installed.

## Reproduction and configuration

Engineering inherits all capture/simulation default-off gates. Extra `COREOPS_RESEND_ENGINEERING_ENABLED=true` and a disposable `COREOPS_RESEND_ENGINEERING_WEBHOOK_SECRET=whsec_<32-byte Base64>` are accepted only inside named loopback N-D rehearsals. Tests generate these keys in-process. `COREOPS_NOTIFICATIONS_SEND_ENABLED=true`, any nonempty VERCEL/VERCEL_ENV, remote URLs or ordinary application database names reject operation. No `.env` change is necessary or authorized.

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_nd_261110 \
  npm run test:notification-resend
npm run build:notification-benchmark
NODE_PATH="$PWD/node_modules" COREOPS_ND_COMPILED=true COREOPS_ND_BENCHMARK=true \
  COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_nd_261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node /tmp/workflowconnect-nd-worker.cjs
```

Run suites sharing notification GLOBAL controls sequentially. Keep the benchmark database separate from regressions. N-B/N-C scripts and domain suites use `coreops_auth_rehearsal_notifications_nd_reg_261110`; C uses its dedicated export rehearsal. Preservation prepare/verify surrounds `prisma migrate deploy` on the populated clone only. Never run these against normal/preview/production data.

Evidence logs: `/tmp/workflowconnect-nd-{tests,built-worker,migration,reg-migrate,preserve-migrate,nb,nc,regressions,exports,units,auth-config,format,types,focused-lint,lint,validate,drift,build,http}.log`. Preserve required evidence outside temporary storage before relying on it for rollout.

## Review blockers and stop

1. Approve a subsequent code/release decision before any external transport, domain-worker activation, actual provider callback processing or deployed schedule. N-D has no environment-only enable path.
2. Independently approve/configure provider account/domain/DNS, restricted credentials, actual quotas/rates/budget, webhook-key rotation, support mailbox and named operational owners. Verify genuine HTTP/network/callback/inbox behavior under capped disposable-recipient authorization.
3. Implement independently durable witness/admission and incremental reconciliation; prove whole-environment restore cannot resurrect accepted/UNKNOWN sends or remove suppressions. Local mocks/files do not meet this gate.
4. Approve template copy, source-history cutover, required-notice evidence/lead time, retention and suppression review. Provider acceptance and simulated delivered outcomes cannot satisfy legal notices.
5. Complete actual signed-in platform roles/MFA, deployed host/header/action behavior, realistic multi-instance queue capacity, durable wakeups, bounded operational pagination and monitoring/incident drills. Actual Neon/Vercel settings and Node 22+ runtime selection are unverified.
6. N-X remains separately gated; EXPORT_AVAILABLE stays disabled and C's artifact lifetime remains 15 minutes. No invitation/global-security/membership producer, marketing or routine task email was added.
7. Live lifecycle enforcement, deletion/anonymization, customer-data recovery and production migrations retain their separate approvals. This checkpoint does not resolve unrelated launch findings.

**No live email, real Resend request, provider/DNS/credential configuration, preview/production migration, deployment, Cron activation, live lifecycle enforcement, legal-document change, or customer deletion occurred. Stop at N-D for review.**
