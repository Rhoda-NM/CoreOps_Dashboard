# N-X — pre-implementation export capacity and compatibility assessment

10 November 2026. **Assessment completed before application/schema changes. N-X is not accepted or deployed.** The approval requires a capacity decision before implementation and says: “If the existing database approach cannot reasonably support the expected workload, stop and propose private object storage or an alternative design for review.” Expected production peak/frequency and target storage budget have not been supplied; a workload clarification is pending. No provider has been provisioned or queried.

## Current design and incompatibilities

| Finding | Verified source | Required N-X compatibility change (not implemented here) |
| --- | --- | --- |
| One immutable `expiresAt`, set 15 minutes after submission; completion does not start a new timer | [request and preparation](../src/server/data-access/exports.ts#L41), [schema](../prisma/schema.prisma#L716), [immutability trigger](../prisma/migrations/20261109000300_secure_export_recovery/migration.sql#L178) | Separate bounded generation deadline, successful generation timestamp and at-most-24-hour artifact expiry. Forward migration; do not reinterpret old rows as new 24-hour grants. |
| Token is deterministic per export/requester; one hash on request | [security](../src/server/data-access/security.ts#L22) | Independently random short-lived authorization records, identity binding and unique token hashes; five-minute cap also limited by artifact/grant expiry. Old deterministic authorizations must never inherit the longer artifact lifetime. |
| First download changes status to DOWNLOADED and clears ciphertext/token before response completion | [download](../src/server/data-access/exports.ts#L111) | Keep encrypted artifact separate from each single-use authorization/attempt. Interrupted transport can use a freshly authorized download, never replay the old token. |
| One open REQUESTED/PROCESSING/READY export per workspace; five new requests per user/hour; no global READY-byte/count limit | [service](../src/server/data-access/exports.ts#L53), [unique index](../prisma/migrations/20261109000300_secure_export_recovery/migration.sql#L150) | Audited explicit cancellation/supersession under fresh Owner MFA, preserve other requester's history, fence active leases. Add a reviewed global storage/admission budget if retaining database artifacts. |
| Ciphertext in ByteA, 8 MiB ZIP cap, 4 MiB source and 20,000 total/5,000-per-table row limits | [content limits](../src/server/data-access/export-content.ts#L5), [SQL checks](../prisma/migrations/20261109000300_secure_export_recovery/migration.sql#L152) | Preserve bounds; measure storage and transfer overhead rather than treating ZIP size as total cost. |
| Full ciphertext and full plaintext are materialized before chunking network response | [decryption](../src/server/data-access/security.ts#L29), [response](../src/server/data-access/download-handler.ts#L7) | Chunked HTTP does not mean bounded-memory cryptographic/database streaming. Preserve authenticated GCM verification before releasing plaintext; capacity must include buffers, driver encoding and concurrent functions. |
| Generation serialized globally; two-second SQL timeout, six-second elapsed check, eight-second transaction; download has four global crash leases | [generation](../src/server/data-access/exports.ts#L66), [download admission](../src/server/data-access/exports.ts#L93) | Separate generation/download lease identities and fenced releases. Old release by request ID alone cannot safely clear a later re-download's lease. |
| Download lease lasts 60 seconds; response timer 25 seconds; no deployed cleanup schedule | [release/interlock/cleanup](../src/server/data-access/exports.ts#L117), [stream](../src/server/data-access/download-handler.ts#L11) | Recheck current authority before bytes, keep active leases visible to future purge, bound/resume cleanup with failure outcomes; expired access must fail regardless of cleanup. |
| Root-key change invalidates artifacts, no artifact key-version/ring | [encryption](../src/server/data-access/security.ts#L15) | Explicit artifact key version and reviewed key-availability/rotation contract; absent key fails closed, no plaintext fallback. Keys remain server-only, never in database ciphertext rows. |
| Recovery approval is immutable and at most 60 minutes | [grant](../src/server/data-access/grants.ts#L6), [SQL](../prisma/migrations/20261109000300_secure_export_recovery/migration.sql#L163) | Never extend a grant to match 24-hour artifact storage. Reauthorization/release uses the earlier grant deadline and existing consumption/scope rules. Resolve any notification/service policy difference explicitly. |
| Ready notification uses request expiry and requires status READY; outbound already blocked | [recipient relevance](../src/server/notifications/recipients.ts#L65), [N-D](notifications-checkpoint-nd.md) | Use actual artifact expiry plus effective grant window, current requester authority and a proposed minimum 30-minute useful remaining window. Missed window suppresses/reviews; no artifact/token/grant in email and no sending enabled. |
| Existing event key allows one `EXPORT_DOWNLOAD_AUTHORIZED` per export | [event contract implementation](../src/server/data-access/events.ts#L6) | Repeated authorization/attempt auditing needs distinct operation identities without changing historical event keys or duplicating source notifications. No unnecessary new lifecycle event type. |

These are verified code findings, not new implementation claims. Current authorization still requires live verified Clerk identity, unchanged binding, current Owner/reviewed grant, strict MFA and central host. Platform roles alone do not grant export access. No permission relaxation is proposed.

## Conservative storage scenarios

An 8 MiB ZIP is 8,388,608 bytes. Current AES-GCM envelope adds 12 nonce + 16 tag bytes: **8,388,636 bytes** per maximum-size artifact. Encryption makes reliable compression savings an unsafe planning assumption. Values below are estimates for simultaneous maximum-size available artifacts, excluding all business data, indexes, TOAST overhead, WAL, snapshots and backups.

| Simultaneous artifacts | Raw ciphertext | Binary GiB | One full download each | Nominal 3× planning envelope, not measured PostgreSQL amplification |
| --- | --- | --- | --- | --- |
| 10 | 80.0003 MiB | 0.0781 | 80 MiB | 240.001 MiB |
| 100 | 800.0027 MiB | 0.7813 | 800 MiB | 2,400.008 MiB |
| 1,000 | 8,000.0267 MiB | 7.8125 | 8,000 MiB | 24,000.080 MiB / 23.4376 GiB |

The illustrative 3× envelope covers a live ciphertext copy, one generation of unreclaimed ciphertext and one independent snapshot copy. It is **not a worst-case upper bound**: WAL, multiple backups/PITR, repeated exports, long transactions and delayed cleanup can exceed it. No actual Neon tier or remaining capacity is inferred.

Frequency must be supplied independently of peak occupancy. With one cohort generated daily, healthy 24-hour expiry yields roughly one cohort of live artifacts; a 48-hour cleanup outage can add two expired cohorts. At 1,000 maximum-size artifacts/day that is approximately **23.44 GiB of ciphertext present after three cohorts**, before database overhead, snapshots or WAL. Supersession/re-download policies change churn/egress: re-download should not rewrite ciphertext, but repeated generations still create new data. A user's five-requests/hour limit is not a global capacity budget and does not provide a physical-storage ceiling.

## Measured local evidence

Read-only benchmark: Node 22, local PostgreSQL **16.14**, ten in-memory maximum-size AES-256-GCM encrypt/decrypt iterations using the same nonce/tag/AAD layout as the current service, and three binary-parameter `SELECT` roundtrips. Ephemeral keys/random synthetic bytes only. No export was requested or generated from business records. Every SQL operation ran in `BEGIN READ ONLY`; no table, WAL/storage fixture or database was created.

| Measurement | Observed result / limit |
| --- | --- |
| Plaintext / ciphertext size | 8,388,608 / 8,388,636 bytes |
| Median encrypt / decrypt | 20.016 / 14.761 ms |
| Median local SQL parameter echo | 192.288 ms, includes sending and receiving maximum ciphertext; not an actual TOAST read, Prisma query or regional Neon transfer |
| Peak observed process RSS | 231.62 MiB sampled between operations; includes pg, synthetic input/output and GC history, not a per-artifact multiplier or function sizing result |
| Existing isolated preservation aggregate | One export row, 25 ciphertext bytes; relation including indexes/TOAST 114,688 bytes. Synthetic fixture only; not a populated-load benchmark or evidence of valid maximum-size exports |

Evidence `/tmp/workflowconnect-nx-capacity.json`; temporary benchmark `/tmp/workflowconnect-nx-capacity.cjs`. Random input was never written to a database or public location. Local microbenchmarks do not certify 100/1,000-artifact storage, concurrent download memory, actual table churn, WAL volume, backup costs or cloud connection capacity. No write benchmark was run because this assessment is read-only.

## PostgreSQL, WAL and backup implications

Large ByteA is stored using PostgreSQL's out-of-line TOAST mechanism. High-entropy ciphertext should be budgeted near its original size plus chunk/index overhead. Replacing/clearing it creates MVCC/TOAST cleanup work; ordinary vacuum makes reusable space but does not generally shrink files. Physical removal from all snapshots is a separate retention question. See [PostgreSQL TOAST](https://www.postgresql.org/docs/current/storage-toast.html) and [vacuum behavior](https://www.postgresql.org/docs/current/routine-vacuuming.html).

New ciphertext creates WAL and replication/PITR traffic. Its exact amplification depends on actual PostgreSQL/Neon storage, checkpoints/full-page writes, compression, transaction pattern and backup configuration; no multiplier was measured or guaranteed. Holding ready artifacts 24 hours increases the chance snapshots retain them even when application cleanup later clears ByteA. Application expiry and key-controlled access do not prove physical removal from backups. Provider retention, encryption/key ownership, restoration handling and vacuum/storage accounting remain external checks; no backup was opened, overwritten or deleted.

## Connections, download memory and Vercel compatibility

Current generation holds one transaction/connection and the workspace lock while building/encrypting the archive; all workspaces share one advisory admission slot. Download briefly holds a transaction while loading/decrypting/consuming, then releases it before network streaming. Four database-backed leases bound already-authorized responses, but HTTP/function instances and default database pools can multiply independently. The current Prisma client has no explicit aggregate connection ceiling ([client](../src/server/db/prisma.ts#L25)). Regional pooling, per-instance maxima and total application/worker budget must be verified against the selected Neon compute before a rollout.

Four 8 MiB downloads mean at least 32 MiB of plaintext resident across responses, with ciphertext/decryption copies and PostgreSQL driver wire-format buffers in addition; this is a lower bound, not a measured memory ceiling. The browser currently builds a complete Blob. Re-download increases egress but need not increase artifact storage. The current 25-second timer must be tested on slow/interrupted HTTPS clients; bytes released before a revocation cannot be recalled.

Vercel's documented 4.5 MB buffered-response limit **does not apply to streamed responses**. The current handler returns a ReadableStream; it is not correct to declare 8 MiB downloads categorically impossible on Vercel. Actual framework/adapter streaming, Content-Length behavior, function memory/duration, client cancellation, concurrent instance/pool behavior and deployed private cache headers still require HTTPS acceptance. See [Vercel limits](https://vercel.com/docs/functions/limitations) and [streaming guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions). This assessment does not identify or certify the user's Vercel plan.

## Capacity decision and design choices

**No unconditional ByteA capacity approval can be made from the current evidence.** Ten/100 maximum-size artifacts are technically plausible PostgreSQL workloads, subject to an explicit storage/admission budget and actual plan headroom; 1,000 artifacts is also within PostgreSQL's general capabilities, but is not an established capacity commitment for this application/Neon account. The current design has no global byte ceiling, physical expiry guarantee or measured cloud workload. Treating 24-hour expiry alone as a storage bound would be unsafe.

Two reviewable paths:

1. **Bounded PostgreSQL MVP:** choose expected peak/frequency, reserve a maximum total ciphertext-byte and pending-generation budget transactionally before building, fail closed without disrupting existing downloads, release reservations only after ciphertext is actually cleared, and retain download/per-requester limits. Configure an independently approved storage cap and alert/cleanup runbook. Measure populated churn/WAL, four-download memory, actual pool usage and target Neon/Vercel behavior before deploying. A new limit must be visible to customers as retryable capacity pressure, not silently evict another Owner's artifact.
2. **Private artifact storage for larger/uncertain volume:** retain PostgreSQL authorization, metadata, random one-time authorizations, audited attempts and leases; store only AES-GCM ciphertext under opaque versioned object keys in private storage. Enforce authenticated central POST downloads and server-side authorization at release; no public bucket, no emailed/signed bearer URL that bypasses the approved live-authentication contract. Keep account-bound AAD/key versions, TTL/cleanup jobs, object/database reconciliation and purge interlocks. Select provider/region/access/backup/cost separately. No storage account/bucket or integration is provisioned by this proposal.

Isolated engineering decision after this assessment: proceed with the bounded PostgreSQL path, using a provisional ceiling of 100 retained artifacts and 800 MiB ciphertext, counting expired ciphertext until physical clearing. The first limit wins: 100 maximum-size ZIPs plus GCM overhead would slightly exceed 800 MiB, so the byte cap admits 99 at that exact maximum. This is a conservative rehearsal resource budget, not an inferred production workload or Neon plan approval. Target production volume remains a pending decision; do not raise this cap or claim 1,000-artifact support without separate capacity evidence. The approved re-download and supersession requirements can be implemented with either storage backend; neither requires broader tenant/platform privileges. The five-minute authorization, 24-hour-from-generation artifact window and independent recovery expiry remain separate.

## Verification and stop boundary

Only source/documentation inspection, in-memory synthetic crypto and read-only local SQL were performed. No application code, Prisma schema, migration, environment variable file, external configuration, existing legal document or database record was changed for this assessment. This section describes the pre-implementation assessment only; subsequent N-X code/tests must be recorded separately. N-D/C results remain historical; no new N-X acceptance suite/build result is claimed.

Before accepting N-X, implement the selected storage/admission contract and forward compatibility changes, then perform the full boundary/concurrency/rotation/recovery/supersession/notification tests, migration preservation and requested regression/build checks. Signed-in browser, actual Neon/Vercel capacity/backup/streaming acceptance remain separate. Keep deployed exports/lifecycle processing and outbound EXPORT_READY disabled. No real email or customer export occurred.
