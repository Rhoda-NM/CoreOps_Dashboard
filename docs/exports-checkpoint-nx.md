# N-X — Secure export availability acceptance report

10 November 2026. **Isolated implementation for review. No deployment, live export, notification delivery or lifecycle rollout is enabled.** N-D is accepted as the preceding engineering milestone. This checkpoint does not authorize real Resend sending, new external storage, preview/production migration, deletion or subsequent lifecycle checkpoints.

## Capacity assessment and implementation choice

The [mandatory assessment](exports-checkpoint-nx-capacity.md) was completed **before** application/schema edits. It inspected C, the event contract, N-A/B/C/D reports, source/schema/constraints, crypto/download/cleanup behavior and official PostgreSQL/Vercel documentation. Its SQL used `BEGIN READ ONLY` on a named isolated fixture database; synthetic crypto and parameter transfers did not persist artifacts.

| Conservative maximum-size scenario | Ciphertext alone |
| --- | --- |
| 10 available artifacts | 80.0003 MiB |
| 100 | 800.0027 MiB |
| 1,000 | 7.8125 GiB |

Each 8 MiB ZIP adds 28 bytes of GCM nonce/tag. Local synthetic medians were **20.016 ms encryption, 14.761 ms decryption and 192.288 ms loopback SQL parameter roundtrip**; sampled process RSS peaked at 231.62 MiB. These are microbenchmarks, not populated TOAST/WAL, four-download, Prisma, Neon or Vercel load tests. Existing fixture relation size was 114,688 bytes with one 25-byte artifact, not representative production utilization.

Engineering proceeds with the bounded PostgreSQL MVP for isolated testing: **100 retained ciphertext artifacts, 800 MiB total ciphertext, 100 pending generations**, one generation slot and four download leases. The count and byte limits apply independently; the first reached wins. At the full 8 MiB ZIP size, GCM overhead means the 800 MiB ciphertext cap admits 99 artifacts rather than 100. Count/byte admission includes expired ciphertext until it is cleared. PostgreSQL triggers and the existing global generation admission lock serialize stored-artifact admission. The 100-artifact test uses tiny nondownloaded synthetic capacity records; it verifies the counter/guard, **not 800 MiB storage throughput**.

**Production peak/frequency and storage budget remain unconfirmed.** A workload question was submitted; no answer is inferred from its default option or elapsed time. These caps are provisional rehearsal resource limits, not approval of a Neon plan or a production SLO. No 1,000-artifact support is claimed. If the required target exceeds this budget, stop for reviewed private-storage/capacity design; do not raise caps automatically. The assessment documents private encrypted object storage as an alternative, with no infrastructure provisioned.

Live ciphertext caps do not cap dead TOAST, WAL, snapshots or backups. At 1,000 maximum-size exports/day, a three-cohort cleanup backlog is roughly 23.44 GiB of ciphertext before overhead. Backup retention, real storage headroom, autovacuum, pooled connections, cloud latency/cost and cleanup monitoring remain external acceptance gates.

## Original and new lifetime model

| Dimension | C / legacy v1 | N-X v2 |
| --- | --- | --- |
| Request/generation | Single 15-minute immutable request deadline | Same 15-minute bounded generation deadline, captured using database UTC clock after locks; SQL checks enforce the upper bound |
| Completion | No independent stored completion deadline | `generatedAt`, captured after successful bounded generation |
| Artifact | Used request deadline | `artifactExpiresAt = generatedAt + 24 hours`, database enforced; no later extension |
| Download credential | Deterministic token per request/requester | Independently random 32-byte token, hash-only storage, maximum five minutes and capped by artifact/grant/lifecycle-access expiry |
| Download consumption | Clears ciphertext and marks DOWNLOADED | Consumes one authorization and records an authorized attempt; ciphertext stays encrypted for authorized retries |
| Recovery | Immutable approved scope and 1–60-minute deadline | Unchanged grant duration; expired/revoked/consumed restoration grant denies further protected access even if artifact remains within 24 hours |
| Expiry enforcement | Use-time checks plus bounded cleanup | Use-time checks remain authoritative; cleanup need not run to deny access |

`expiresAt` remains the immutable request deadline, preserving old rows. Existing rows default `availabilityVersion=1`; no old 15-minute artifact/token is promoted into a 24-hour authorization. N-X download issuance requires v2 identity/key/deadline fields. Old artifacts are not downloadable through the new authorization path and can expire under their original policy; no migration clears them or generates replacements. A separately reviewed rollout must tell affected users to request a new export. No mixed old/new application deployment is approved.

## Actual files and forward migrations

| Files | Change |
| --- | --- |
| `prisma/schema.prisma` | Additive availability, generation, key-version, requester-binding and fenced-download fields; `ExportDownloadAuthorization` with restrictive compound export/workspace FK and hashed tokens. |
| `20261110000800_export_availability/migration.sql` | Additive columns/table; v1/v2 checks, immutable generated identity/ciphertext/bindings, authorization/source/deadline integrity, one-pending-authorization index and serialized artifact storage cap. No backfill. |
| `20261110000900_export_deadline_hardening/migration.sql` | Forward NULL hardening: required deadline/digest/key fields cannot pass CHECK through SQL NULL semantics. The already rehearsed 0008 migration was not edited. |
| `20261110001000_export_generation_deadline/migration.sql` | Forward database upper bound for new request/generation deadlines and processing leases. |
| `src/server/data-access/exports.ts` | Request/generation separation, capacity admission, issuance/consumption, same-ciphertext retry, fenced leases, explicit Owner cancellation, bounded cleanup/cursor/outcomes and safe overview projections. |
| `security.ts` | Versioned AES-256-GCM decryption; current plus at most four canonical previous server-only keys; unavailable keys fail closed. Legacy deterministic helper is no longer used for v2 download authorization. |
| `events.ts` | Optional explicit operation key for independently authorized attempts; old keys/types retained. |
| `grants.ts`, `recovery.ts` | Consumed restoration grant cannot provide export authority; revocation clears derived ciphertext while preserving any outstanding response lease for the purge interlock. |
| `download-handler.ts`, `cleanup-handler.ts` | Pass release fencing token internally; authenticated cleanup accepts bounded `after` cursor. Existing same-origin POST, body limits, private/no-store headers and response time limit remain. |
| `src/app/account/data/{actions.ts,page.tsx}`, `src/components/data-access/DataForm.tsx` | Accurate artifact versus authorization/grant messaging, retry instructions and explicit audited cancellation of an open export before separately requesting a replacement. |
| `src/server/notifications/recipients.ts` | Ready relevance uses actual v2 artifact time and requires at least 30 minutes of useful artifact/grant availability; stale/revoked cases suppress. No send gate is enabled. |
| `tests/data-access.integration.cjs`, `package.json` | Preserve C role/tenant/MFA/financial tests, update changed consumption semantics and add N-X tests; guarded `test:export-availability` runner. |
| This report, capacity assessment and event-contract follow-up | Decisions, evidence and remaining acceptance boundaries. |

The normal local database still has its original **13 completed migrations**, verified read-only. No applied migration was rewritten. No `.env`, Clerk/provider configuration, legal documents, real receiving accounts, production/preview database or deployed schedule changed.

## Authorization, attempts and retry semantics

Every issuance and download still requires central-host context, a live verified Clerk identity, unchanged external-ID/email binding, current Owner authority or reviewed export grant, actual MFA enrollment and strict reverification. Request snapshot identity is immutable. Database membership/binding/lifecycle/grant checks repeat after acquiring the workspace lock. MANAGER/STAFF/platform status alone cannot export. Changed role, suspended ownership, expired retention, administrative suspension/closure and cross-tenant selectors fail closed.

Preparation generates the artifact and initial independent authorization atomically. A READY preparation or `authorizeExportDownload` can issue a fresh authorization after the prior one is consumed, revoked or expired. At most **one outstanding unused authorization per export**, and **five issued authorizations per requester per rolling hour**. Concurrent issuance has one winner. If the response carrying an unused token is lost, wait for its at-most-five-minute expiry before another issuance; no regeneration is needed. Tokens are only returned through the authenticated action response and submitted in a same-origin POST body, never URLs, emails, provider metadata or logs.

Consumption is transactional and single-use. A valid token cannot extend artifact/grant/lifecycle permission. After decryption and digest verification, authority and deadlines are checked again before the service releases bytes. A random response lease fences releases: completion/cancellation of an older response cannot clear a newer lease. Four global leases bound response admission; a 60-second crash lease remains visible, with a 25-second response timer. No transaction is held across network delivery.

An interrupted response can obtain a **different** short-lived authorization and reuse the same authenticated encrypted artifact. Authorization issuance and authorized attempts have explicit identifier-only AuditLog records. Each consumption uses `EXPORT_DOWNLOAD_AUTHORIZED` with an authorization-specific operation key; historical C export-specific keys are untouched. These events are audit-only and never proof that a browser received, saved or opened every byte. Already released bytes cannot be recalled by later revocation. No resumable range/public URL facility was introduced.

## One-open policy and explicit supersession

The existing one-open-export-per-workspace partial unique index remains authoritative. The account page shows minimal open-export metadata for active Owners. A current lifecycle-eligible Owner with fresh MFA may explicitly cancel an open export, including another requester's export; actor/export identity and cancellation are audited. Cancellation invalidates unused authorizations and clears derived ciphertext. It cannot overlap an active generation/download lease. A replacement is a **separate explicit request**, not silent eviction or automatic regeneration.

Cancellation and requests follow User → Workspace lock order to avoid requester/audit races. Reviewed claimants do not obtain general Owner cancellation powers. Canceled/manually restricted workspace policies remain in force; grant expiration/revocation cleanup releases an unusable export slot without restoring membership. No account rebind, role promotion or commercial activation is a side effect.

## Encryption, cleanup and backup limits

AES-256-GCM retains a fresh nonce and the export ID as authenticated associated data. Exact ZIP digest, generated timestamps and key version become immutable once generated. A wrong ID/key or modified ciphertext fails authentication; absent prior keys do not trigger plaintext fallback. Keeping an approved prior root key permits decryption of its immutable artifact without rewriting ciphertext. Actual vault/key-retirement/backup key policies remain unconfigured and require review.

Cleanup visits at most 50 open export candidates and 50 expired-grant candidates, under short workspace transactions and an approximately 18-second admission budget. `after` / `nextCursor` support bounded export scanning; exhausted scans restart from the beginning, including failures. It clears expired/invalid-grant/identity/ownership ciphertext, expires unused authorizations and releases expired crash leases. Failures return bounded `CLEANUP_FAILED` outcomes without raw errors/business content; a caller/operator must review and retry them. No unattended scheduler or durable alert consumer exists.

Outstanding generation/download leases and available artifacts remain visible through `hasActiveExport` under the existing workspace lock for future purge. Revocation does not erase an already-authorized response lease. The separate destructive retention system remains unimplemented/disabled. Clearing ByteA is **not** proof of removal from WAL, dead tuples, snapshots or backups, nor a promise of physical deletion at an exact instant. No backups were deleted or overwritten.

## Notification consequences

The content-free lifecycle envelope and closed event types remain. Ready relevance uses v2 actual generation/availability and a **30-minute minimum useful remaining artifact/grant/lifecycle-access window**. A 30-minute recovery grant may have less than that window by completion and therefore suppresses a future ready notice. This is a conservative engineering relevance threshold, not approval of notification delivery/lead-time/legal policy. Grant expiry still prevents download much earlier than artifact expiry; UI and proposed message requirements say “up to” 24 hours, never promise unconditional 24-hour access.

No ZIP, authorization token, grant or private content enters an event or notification. **EXPORT_AVAILABLE external sending stays blocked** by all existing N-D/N-C/SQL release gates. Completing N-X engineering does not enable Resend, provider callbacks, live lifecycle cancellation or required-notice satisfaction.

## Migration and verification evidence

| Check | Actual result / boundary |
| --- | --- |
| Fresh chain | `coreops_auth_rehearsal_exports_nx_chain_261110`: full chain including 0008/0009/0010 applied from empty. Development iteration database `coreops_auth_rehearsal_exports_nx_261110` is isolated too. |
| Populated preservation | `coreops_auth_rehearsal_notifications_nd_preserve_nx_261110`, cloned from isolated N-D preservation fixtures before N-X: **39 prior tables / 67 records** matched every prior stored column after final migrations. No old request/grant/artifact backfill or expiry extension. |
| Prisma | Validation/generation and schema diff passed; SQL checks/triggers additionally tested. |
| Export/recovery | **29 passing Node tests including parent container**, zero failures. Real PostgreSQL, AES-GCM, ZIPs, locks and HTTP Response streams; Clerk/Next request/clock/fault boundaries substituted. |
| N-B / N-C / N-D | **26 / 24 / 11 passing tests including containers**, zero failures, on isolated N-D regression database with N-X migrations. N-D HTTP uses loopback mocks and genuine Svix test signatures only. |
| Lifecycle/authorization/commercial/identity/payment/Proxy | **88 passed including containers**, zero failures; sequential on isolated regression database. |
| Navigation / host / lifecycle-policy / auth configuration / export format | **4 / 9 / 3 / 3 / 1 passed**, zero failures. |
| Typecheck / focused lint / production build | Passed locally. Full lint: zero errors and 12 existing business-page warnings. No deployment. |
| Built HTTP smoke | **7 passed** against the final loopback bundle: private read-only capture and disabled Resend POST/GET; counts unchanged and temporary server stopped. Not a signed-in download test. |
| Signed-in browser / real HTTPS storage/runtime | **Not performed**. No actual Clerk/MFA/browser, Neon/Vercel capacity or inbox acceptance claim. |

Coverage includes exact generation/artifact/authorization/grant boundaries, completion near the request deadline, repeated downloads with distinct tokens, replay denial, concurrent issuance/consumption, interrupted HTTP retry, crash lease cleanup/fencing, cleanup failure/retry, role/identity/MFA/tenant denial, cancellation/revocation/renewal serialization, consumed restoration-grant denial, explicit other-Owner cancellation, capacity admission, size/partial-generation failures, missing/rotated keys, SQL tenant/deadline immutability, purge interlocks and future ready-notice suppression. Tests do not prove real deployed slow-client behavior or 800 MiB/1,000-artifact throughput.

Development corrections: prior C expectations of ciphertext deletion at download and request-based 15-minute cleanup were replaced with the approved v2 semantics while preserving token replay/access checks. Capacity fixtures initially hit the independent hourly requester quota, so the pending request is now created before synthetic capacity rows. Review found SQL NULL-check and generation-bound hardening needs; separate forward migrations were used. A final combined verification command timed out in automatic permission review before execution; separately retried local tests/build completed successfully. No permission or financial safeguard was relaxed.

## Remaining decisions and review stop

1. Confirm expected peak/frequency, production storage budget and target Neon compute/pooling/backup settings. The provisional 100-artifact/800 MiB cap is not production signoff; use reviewed private encrypted artifact storage if the target cannot fit safely.
2. Verify actual Vercel HTTPS streaming of an 8 MiB response, memory/concurrency/pool use, cancellation, timeout, private headers, slow clients and Server Action CSRF. Vercel exempts streamed responses from its buffered-response limit, but repository tests do not certify this deployment.
3. Complete real verified Owner/reviewed claimant/role-loss/session-revocation/MFA flows and browser download/open/retry evidence; substituted Clerk tests remain limited.
4. Approve cleanup cadence, monitoring/failure escalation, key rotation/vault/backup handling and metadata/audit retention. Expiry is immediate access denial; physical cleanup depends on authorized invocation.
5. Review v1 transition treatment, token/rate/capacity UX, canceled-owner cancellation limitations and next migration authorization before any target rollout. No compatibility backfill is automatic.
6. Separately approve real provider/disposable-inbox integration, templates/cutover/useful delivery thresholds and notice policy. N-X does not enable external sending or satisfy required notices.
7. Keep lifecycle enforcement, deletion/anonymization, independent restore-ledger and other production launch gates unchanged. No automatic progression to another checkpoint.

Reproduction (named isolated migrated database only):

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_nx_261110 \
  npm run test:export-availability
npm run typecheck
npm run lint
npm run build
```

Use N-D's guarded regression commands with `coreops_auth_rehearsal_notifications_nd_reg_261110` after its isolated N-X migrations. Run suites sharing GLOBAL controls sequentially. Evidence: `/tmp/workflowconnect-nx-{capacity.json,final-tests.log,final-chain.log,preservation.json,preservation.log,drift.log,nb.log,nc.log,nd.log,regressions.log,units.log,auth-config.log,format.log,types.log,focused-lint.log,lint.log,build.log,http.log}`. Temporary files are not durable rollout evidence.

**Stop for N-X review. No real email, live customer export, production/preview migration, deployment, external provider change, lifecycle enforcement or destructive customer-data processing occurred.**
