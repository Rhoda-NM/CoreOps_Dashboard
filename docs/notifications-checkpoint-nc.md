# Notification service — Checkpoint N-C acceptance report

10 November 2026. **Isolated simulation implementation; not approved for real delivery or deployment.** This report follows [N-B](notifications-checkpoint-nb.md), [N-A](notifications-checkpoint-na.md), the [schema proposal](notifications-schema-proposal.md), lifecycle [B](data-lifecycle-checkpoint-b.md)/[C](data-lifecycle-checkpoint-c.md), and the [event contract](data-access-notification-contract.md). N-D and N-X are not authorized or started.

10 November follow-up: [N-D engineering report](notifications-checkpoint-nd.md) adds mock-only official Resend REST/Svix compatibility and production preparation. External sending remains blocked; the historical results below are unchanged.

## Delivered implementation

| Files | Change |
| --- | --- |
| `src/server/notifications/simulation-config.ts` | Independent simulation gate, synthetic origin/account/instance binding, disposable cryptographic keys and versioned lookup-key ring |
| `envelope.ts` in that directory | Closed transactional template registry, exact text/HTML hashes, safe central links and authenticated encrypted frozen envelopes |
| `fake-provider.ts` | Normalized provider interface and deterministic Resend-style fake acceptance, rejection, rate limit, pre/post-acceptance timeout, connection failure and malformed-response outcomes; local independent SQL ledger, no email transport |
| `simulation-policy.ts`, `simulation-worker.ts` | Fresh recipient/source checks, indexed suppressions, fenced dispatch, shared rate permits, two in-flight slots, fair lanes, retries, UNKNOWN reconciliation and sanitized runs |
| `simulation-events.ts` | Raw-byte synthetic signature verification, durable inbox, deduplication/conflicts, pending reconciliation, authenticated mapping, independent evidence acknowledgement and monotonic delivery/bounce/complaint facts |
| `restore-simulation.ts` | Independent fake-ledger comparison for app instance, dispatch history, callback evidence and active suppression requirements |
| `simulation-admin.ts` | Role-filtered projections, synthetic previews, audited controls/admission and narrowly reviewed replacement of known rejected generations |
| `src/app/platform/(protected)/notifications/{page.tsx,actions.ts}` | Central private operations page, health, queue/review filters, evidence, runs, required notices and SUPER_ADMIN controls |
| `src/app/platform/(protected)/layout.tsx` | Navigation appears only when isolated simulation configuration is valid |
| `src/server/notifications/recipients.ts` | Notification eligibility fix: a referenced recovery grant is always checked, including the current episode, even if the claimant is also an owner. Export authority/TTL itself was not changed. |
| `prisma/schema.prisma` | Simulation evidence flags, immutable identity-key version, reviewed replacement reference, permit slots, lane cursor, instance/account binding and untrusted candidate inbox references |
| `prisma/migrations/20261110000300_notification_simulation/migration.sql` | Additive simulation schema and forward expansion of N-B capture guards; capture behavior preserved |
| `prisma/migrations/20261110000400_notification_simulation_lanes/migration.sql` | Shared lane cursor and immutable logical-notification/attempt-mode checks |
| `prisma/migrations/20261110000500_notification_simulation_instance_scope/migration.sql` | Nullable account binding for old instance markers: absent bindings remain quarantined, never invented |
| `prisma/migrations/20261110000600_notification_simulation_inbox/migration.sql` | Bounded immutable candidate references for verified-but-unmatched callbacks |
| `tests/notification-simulation.integration.cjs` | Real PostgreSQL/fake-ledger integration, controlled Clerk/clock/crash boundaries, server-rendered administration checks, restore drill and optional 10× workload |
| `scripts/notification-nc-preservation.cjs`, `package.json` | Guarded populated preservation evidence and `test:notification-simulation` command |

No applied migration was rewritten. No `.env`, production/preview database, provider credentials, DNS, Vercel configuration, scheduler, subscription activation policy, authorization matrix or existing legal document was changed. No real administrator was bootstrapped. No new business, membership, invitation or global account-security producer was added.

## Provider and payload contract

`NotificationProvider` accepts a frozen envelope plus immutable destination-fingerprint context and returns a normalized result. The only dispatch implementation admitted by the worker is `FakeResendProvider`. Its connections must be loopback PostgreSQL in a separately named `coreops_auth_rehearsal_sim_provider_*` database; there is no Resend SDK, SMTP, HTTP email client or real delivery endpoint. Sender, recipients and central links use reserved `.test` addresses/domains.

The provider supports deterministic ACCEPT, REJECT, RATE_LIMIT, TIMEOUT_BEFORE, TIMEOUT_AFTER, CONNECTION_FAILURE and MALFORMED scenarios. Its independent ledger persists message identity, envelope hash, destination fingerprint/version, first dispatch and call count. Restarting the fake provider retains same-key deduplication. A mismatched body/destination is rejected. After its window the fake deliberately fails closed; it does not emulate an unsafe fresh delivery after key expiration.

These are **Resend-style semantics behind an application interface**, not actual SDK/HTTP/Svix interoperability. Scripted timeout/connection-failure outcomes do not establish real network timeout behavior. Genuine adapter validation remains N-D work.

Templates are versioned simulation copy, not production-approved email copy. Exact sender/recipient, subject, text, HTML, authenticated central link, kind/version, content hashes and stable provider key are encrypted before dispatch intent. AES-256-GCM uses a random nonce, purpose-derived key and notification ID as authenticated additional data; the envelope hash and key version are stored separately. Identity and normalized destination fingerprints use purpose-separated keyed HMACs. Tests generate keys in process; keys are never stored with ciphertext or committed to configuration.

Body content is generic transactional status only. It excludes business names/content, clients, project/task data, amounts, payment instructions, ZIPs, download/recovery tokens, provider credentials, ownership evidence and internal review reasons. Links require ordinary live authentication and any existing MFA/authorization at the destination. There is no email access grant.

Freeze and DISPATCH_INTENT commit before the provider call. Attempt/provider scope, key, hash and frozen identity are restrictive and immutable. App transactions end before fake provider I/O. Reusing a key cannot change the frozen destination/body/provider. Before a later retry, current verified Clerk binding, role, source, grant, suppression and deadlines are checked again. Retaining an old digest lookup key does not permit a new destination to replace a frozen one.

## Dispatch and UNKNOWN state machine

- PENDING/RETRY_PENDING → CLAIMED with a random 90-second lease and version fence.
- Preparation verifies current source/recipient and creates encrypted snapshot plus SIMULATED/DISPATCH_INTENT. `dispatchedAttempts` counts persisted dispatch intentions, not proof of SMTP traffic.
- ACCEPTED → SETTLED / PROVIDER_ACCEPTED. It does not imply delivered-to-server, reading, legal sufficiency or activation.
- Known rejection → SETTLED / FAILED. An independently reviewed SUPER_ADMIN replacement creates a linked next generation with a new key. Accepted, UNKNOWN and already-replaced messages cannot use this control.
- Rate limit → RETRY_PENDING with a future deadline; no sleep inside the processor. Shared-budget denial does not consume a provider attempt.
- Ambiguous response, exception or expired unfinished dispatch intent → UNKNOWN / review. Reconciliation reads the authoritative fake ledger; acceptance can be recorded without resending. A non-accepted lookup may schedule the identical key/envelope within the safe window while retaining UNKNOWN until a known outcome occurs.
- After the safe window, uncertain work remains manual review. There is no force-send or force-retry UI/action.
- Late workers can persist their factual attempt result but cannot overwrite a newer outbox lease or stronger callback facts. Completed attempt history is not rewritten.

The local safe window is **23 hours from first dispatch intent**. Resend documents a 24-hour idempotency lifetime; future actual transport must preserve identical keys/payloads and account/environment scope, without extending that assumption indefinitely. [Official idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).

Crashes are tested immediately before the provider call, while a call is held, after independent acceptance, and before local outcome persistence. Reclaim materializes UNKNOWN; it never turns a restored actual-provider attempt into a fresh capture or silently abandons its evidence.

## Coordination and bounds

A GLOBAL row lock allocates a conservative one-request-per-second permit shared across processors. Two database slot records bound in-flight simulated requests. Short claims use row locks/SKIP LOCKED and token fencing; provider calls do not hold app transactions. Direct application transactions have bounded timeouts.

Runs admit up to **20 intentions**, at most two simultaneous dispatch functions. The shared permit follows a persisted 3 urgent : 1 standard lane order and borrows when the preferred lane is empty. Lane queries are independently bounded, so an old urgent prefix cannot hide standard candidates. Paused kinds, expired work, other simulated account scopes and export-ready messages are excluded from admission.

An approximately 18-second work-admission budget leaves excess work queued. There is no sleep-based provider retry inside `runSimulation`. A fast fake run may dispatch fewer than 20 intentions because the shared rate budget is authoritative. A genuine scheduling/queue strategy must revisit deferred work at the recorded deadline; this release does not claim that a once-per-minute Cron could deliver 20 messages per invocation.

Suppression checks use indexed scope/key-version/destination predicates. They do not load an arbitrary first 1,000 destinations. Up to four explicitly configured previous lookup keys may be consulted; any unknown active version fails closed. Old frozen snapshots retain their original digest version, including a crash before the first provider request. More than 1,000 suppressions and actual digest-key rotation are exercised. Production rotation/release policy still needs approval.

## Synthetic callback contract

There is **no HTTP webhook route or live callback registration** in N-C. The server-only abstraction accepts at most 16 KiB, validates a five-minute signature window and authenticates exact raw bytes with an independent synthetic HMAC key. It binds event ID, timestamp, account/environment and body digest. This is a deliberately named synthetic protocol, not Resend's actual signature format.

Authenticated scope + event ID is the dedup identity. Identical replays are harmless; digest conflicts become quarantined without rewriting original evidence. Malformed authenticated bodies retain a minimal quarantine record, not raw customer payload. Candidate references are bounded and immutable; they are not trusted foreign-key associations.

Association requires independent fake acceptance plus matching scope, message ID, envelope hash and frozen destination. An optional authenticated attempt reference must match the same generation/key/hash; absent references are not fabricated by guessing the latest attempt. Unavailable provider state can remain VERIFIED_PENDING and reconcile later. Contradictory or unmatched mappings remain quarantined.

Callback facts preserve accepted, delivered-to-server, bounced and complained timestamps separately. Stronger outcomes are not overwritten by later acceptance/delay events. Bounce/complaint creates an indexed suppression atomically with application evidence. A callback arriving before API-result persistence can establish delivery evidence; the late API result cannot downgrade it.

All N-C rows are marked `simulated=true` and bound to a simulation scope. An APPLIED simulated event is not genuine legal-delivery evidence. `LifecycleNotice` still permits only OPEN/REVIEW_REQUIRED; no simulated outcome, operator, accepted message or callback can resolve it or authorize cancellation/deletion.

## Private administration and recipient safety

`/platform/notifications` requires the existing central-host and active database-backed platform role/MFA checks independently of navigation. The page is disabled outside isolated simulation. Projection happens in the service:

| Role | Visibility / authority |
| --- | --- |
| SUPPORT | Aggregate kind/template/processing/outcome, backlog and callback health; no intention identifiers, recipient details, bodies, controls or evidence payloads |
| BILLING_ADMIN | Appropriate billing-category queue/health, with identifiers and safe factual status; no recovery/legal cases, raw recipients or SUPER_ADMIN controls |
| SUPER_ADMIN | Operational queues/runs, required-notice review, callback/suppression counts and reviewed controls; no stored email body/ciphertext/credential viewer or fabricated-evidence action |

Controls recheck current SUPER_ADMIN status transactionally, require recent MFA and a bounded reason, and commit existing PlatformAuditEvent records. The database actual `enabled` transport flag cannot become true. Instance admission checks the independent ledger; a reason cannot override missing history. Known-rejection replacement preserves explicit audit linkage and generations.

Preview uses synthetic data only. The page includes latest/queued/review views, separate processing/provider outcomes, acceptance versus delivered-to-server timestamps, bounce/complaint evidence, callback health, template-version health, backlog age, run failures and unresolved notices. Lists are bounded to 100 intentions/notices, 25 runs and 500 closed-registry health groups; large-scale browsing/pagination is not completed.

Generic recipients do not need an online MFA session. Sensitive actions reached later still do. Clerk unavailability/429 schedules retry rather than using a stale/guessed address. Unverified/conflicting identity is non-sendable. No legacy identity rebind occurs.

Recovery/exports retain claimant-specific policy. Referenced grants are checked even for an active owner, including current episode, expiry/revocation and consumption. Denied/revoked/expired status messages can still address the independently verified original claimant. Actual export-ready dispatch is blocked in controls, worker and SQL pending **N-X**. C's 15-minute request/artifact lifetime is unchanged; the 24-hour-after-generation product target is not implemented here.

## Restore admission, cutover and evidence limits

Simulation account scope is stable across app-instance IDs. An app marker is bound to that scope, and an independent fake admission record must exist. Before dispatch the system compares provider-key/hash history and authenticated callback history with the application copy, and verifies bounce/complaint suppression obligations. An external acknowledgement records that application callback evidence committed. Pending acknowledgement gaps block dispatch for reconciliation; acknowledged missing history quarantines the instance.

A real custom-format pre-dispatch application backup was restored into a separately created isolated database while the fake provider ledger remained outside that restore. The restored copy was rejected before dispatch because later provider history was absent. The intact parent could be readmitted only after its records matched. No old UNKNOWN attempt was recast as a fresh intention.

**This is not production restore admission.** Both local databases share one PostgreSQL host. The fake ledger is outside the application dump boundary, but is not independently durable against cluster-wide restore, operator deletion or account compromise. Comparison bounds (5,000 provider/evidence entries), full-history checks, secrets, privilege separation, watermark/admission design and operational recovery need N-D review. External test-ledger data is scoped to disposable fixtures and cleaned after tests; it is not a production retention system.

Historical dispositions and canonical keys are preserved. Startup/migrations do not promote HISTORICAL_REVIEW, create historical emails or infer missing commercial transitions. Future live cutover still needs an explicitly approved UTC boundary, legal-notice disposition, independent restore admission and provider/dedup/suppression reconciliation. No template deployment or changed instance ID is a resend authorization.

## Migration rehearsal and preservation

- Normal `core_ops_db`, preview and production were not migrated; no remote configuration was changed. A read-only check confirmed normal `core_ops_db` still has its original **13 completed migrations**.
- The full chain was applied from empty to `coreops_auth_rehearsal_notifications_nc_final_261110`; a separate empty migrated `coreops_auth_rehearsal_notifications_nc_regress_261110` copy supports sequential regressions.
- `coreops_auth_rehearsal_notifications_nc_preserve_261110` was cloned from the populated N-B rehearsal before N-C migration. Synthetic CAPTURED outbox/attempt evidence was added before fingerprinting. All **37 existing tables / 65 records** matched after migration when comparing every pre-existing column.
- Preserved categories include identities, memberships/assignments, operational/financial records, quote/receipt/reversal evidence, B/C history/export/recovery/legal records, and N-B captured evidence. New simulation fields default false/null; only the two empty permit slots are seeded. No customer backfill or notification replay is a migration effect.
- Failed development fixtures and separately restored copies remain confined to explicitly named isolated databases. Final test cleanup derives all records from test-created workspace IDs, including sources reconciled during the run. No cleanup targets production/shared customer data.
- Protected pre-dispatch test backups are `/tmp/workflowconnect-nc-before-dispatch-<instance>.dump` (0600). Existing backups were not overwritten/deleted. Temporary local files are not durable production backups.

## Verification and observations

Final isolated results are recorded below. No browser/provider/inbox result is inferred from substituted boundaries.

| Check | Result |
| --- | --- |
| Final N-C functional + workload suite | **25 passed including parent container** in the final workload run; **24** in the functional-only run. PostgreSQL, encryption and independent fake ledger are real; Clerk/clock/fault boundaries are substituted. |
| N-B capture regression on N-C schema | **26 passed including parent container**, zero failures, on the N-C schema. |
| Existing B/authorization/commercial/identity/payment/proxy | **87 passed including containers**, zero failures, on the isolated N-C regression database. |
| C export/recovery | **18 passed including container**, zero failures, against the dedicated isolated export database. |
| Navigation / host / lifecycle-policy / auth configuration / export format | **4 / 9 / 3 / 3 / 1 passed** respectively. |
| Prisma validation/generation, fresh/populated migration, drift | Passed; final full-chain and populated rehearsal passed; Prisma diff: **No difference detected**. |
| TypeScript / focused ESLint / full lint / production build | Passed; focused N-C lint has no errors/warnings. Full lint has zero errors and 12 existing business-page warnings. |
| Actual local built HTTP machine-route checks | **5 loopback production-bundle checks passed** against the isolated regression database; private dry-run/authentication/bounds/POST behavior preserved, counts unchanged, temporary server stopped. |
| Real Clerk/MFA browser, Resend/Svix, inbox and deployed runtime | Not performed; no claim of external compatibility, delivery or production readiness |

The suite replaces Clerk/request/clock and crash boundaries; PostgreSQL constraints, fencing, independent fake ledger, crypto, callback transactions and the restore are real. Server-rendered page checks substitute the client form shell; they are not interactive signed-in browser acceptance. No external email library is loaded and an outbound HTTP tripwire remains at zero during simulation tests.

The 10× exercise uses 200 intentions (150 urgent/50 standard), 20 concurrent dispatch processors, the real shared one-request/second budget and the two-slot cap. A bounded sampler observes PostgreSQL connections/activity, occupied permits, fake calls, Node RSS/CPU and latency. It is a local synthetic exercise on a shared machine, not production sizing or real provider throughput. Measurements include the test harness/TypeScript runtime and conservative history checks; short activity peaks between samples can be missed.

| Workload observation | Measured result |
| --- | --- |
| Accepted / unique simulated attempts | 200 / 200; no duplicate logical dispatch |
| Elapsed / accepted throughput | 281.114 seconds / 0.711 per second |
| Concurrent dispatch processors / round admission | 20 / 20 intentions; direct dispatch rounds stress shared coordination; run-function bounds are tested separately |
| Dispatch invocations, including deferrals | 3810 |
| Median / p95 invocation latency | 587.61 / 788.28 ms; includes deferred calls, not inbox latency |
| Peak observed DB connections / active connections | 15 / 11; app and fake-provider databases, sampled every 100 ms |
| Peak occupied permits / actual concurrent fake calls | 2 / 1 under the 1-request/second budget |
| Peak Node RSS | 605.63 MiB, including ts-node, test framework and imported application modules |
| CPU user / system during workload | 133.207 / 9.427 seconds |
| First eight accepted lanes | urgent, urgent, urgent, standard, urgent, urgent, urgent, standard |

The history comparisons are bounded development safeguards, not a scalable production admission design. Memory/CPU measurements require review before enabling a genuine delivery runtime; they cannot be translated directly into a production function size. The independent provider is local SQL, so these numbers do not predict Resend latency or inbox delivery.

An earlier workload hit its 330-second harness deadline because a fixed one-second sleep was added after each round. The harness was changed to wake at recorded permit/queue deadlines; the application rate limit was not relaxed. An early regression run incorrectly overlapped suites sharing isolated global controls; sequential rerun is the acceptance evidence. Callback lock-query/fixture timing and scoped cleanup were corrected without weakening safety assertions.

Reproduction (isolated databases must already exist and be migrated):

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_nc_final_261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/notification-simulation.integration.cjs
COREOPS_NOTIFICATION_RUN_LOAD=true \
  COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_nc_final_261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/notification-simulation.integration.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_notifications_nc_regress_261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node tests/notifications.integration.cjs
npm run typecheck
npm run lint
npm run build
```

The test creates disposable keys and synthetic identities in-process; it never edits `.env`. The fake provider uses `coreops_auth_rehearsal_sim_provider_20261110`. Do not run these integration suites concurrently against a shared application rehearsal's controls. Backup/restore tests require local Docker/PostgreSQL utilities and retain separately named synthetic restored copies.

Configuration gates remain: capture flag + simulation flag; SEND=true rejects; VERCEL/VERCEL_ENV rejects; app and independent provider databases must be explicitly named loopback rehearsals; test-user allowlist is required. Simulation key, webhook key, digest key/optional previous keys, account UUID, instance UUID and HTTPS `.test` central origin are server-only. GLOBAL and per-kind capture/simulation database controls default off; no actual transport setting can be enabled. No live Cron or HTTP webhook route was installed.

Evidence: `/tmp/workflowconnect-nc-{tests,load,load-initial-budget,nb-regression,regressions,exports,units,types,lint,build,http,migration,final-chain,populated-migration,preservation,drift}.log`, protected fingerprint JSON and test dumps. Preserve required evidence outside temporary storage before relying on it for rollout.

## N-D / N-X and launch blockers

1. Separately approve N-D before an actual Resend adapter/SDK, authenticated genuine webhooks, sender/domain credentials, live controls, deployment or customer email. Validate real account capabilities, timeouts/hidden retries, idempotency, response schema, signature rotation, quotas, suppressions and callback delivery.
2. Approve production templates, commercial/legal wording, recipient/required-notice evidence/lead-time policy, source-history cutover and retention schedules. Simulated evidence cannot satisfy notices or authorize purge/cancellation enforcement.
3. Replace the provisional local restore-admission exercise with independently durable, protected provider/dedup/suppression reconciliation and instance admission; prove old backups cannot reintroduce historical sending after whole-environment recovery.
4. Review measured CPU/memory/connection use, per-dispatch history comparison cost, queue cadence and actual shared deployment capacity. The local test is not a scalable sending claim. Add monitoring, alerts, operational pagination/runbooks and an approved worker/scheduling strategy before rollout.
5. Complete real signed-in central-host/MFA/role acceptance, provider/inbox acceptance and deployed runtime verification. Current mocked/server-rendered checks do not establish these.
6. N-X must implement and validate the 24-hour artifact target, secure storage/cleanup, token/grant lifetime and useful delivery window before export-ready emails. This checkpoint does not alter C's current lifetime.
7. Invitation email, global account-security and membership-subject producers remain outside scope. Lifecycle enforcement, deletion/anonymization, legal holds and purge-safe restore remain separately gated.

**Stop for N-C review. No live email, real provider call/credential configuration, deployment, Cron activation, production/preview migration, live lifecycle enforcement or customer deletion occurred.**
