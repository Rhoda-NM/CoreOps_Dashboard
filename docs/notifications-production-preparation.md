# Resend production preparation — N-D review only

10 November 2026. No provider purchase/configuration, DNS change, sender publication, credential provisioning, Cron activation or deployment is authorized. The code has no live HTTP transport and `createLiveResendTransport()` always throws. N-D evidence is simulated even though HTTP fields and signatures follow genuine contracts.

## Sender, permissions and ownership proposal

| Item | Proposed contract / required confirmation |
| --- | --- |
| Sending identity | `WorkflowConnect <updates@notify.workflowconnect.io>`; separate approved WorkflowConnect sending domain, never infer another Stravect domain covers it |
| Reply-to | `info@stravectsystems.com`; confirm mailbox ownership, monitoring, support response times and recovery escalation before use |
| Resend account | Explicit approved account/team and environment, account owner and alternate recovery operator; no assumption about connected accounts |
| Sending API key | Server-only, least privilege Sending Access restricted to the approved domain. Do not use a full-access administration key for the worker. Validate actual provider permission support |
| Reconciliation | Independently approved read credential or controlled provider operator workflow; do not broaden send-key permissions silently. Known-ID retrieval does not establish a lookup by idempotency key |
| Webhook secret | Dedicated per account/environment/endpoint; never reuse the synthetic HMAC or another application's secret. Vault ownership, rotation overlap and rollback procedure must be approved |
| DNS | Provider-issued DKIM and SPF records for `notify.workflowconnect.io`, then independently validated DMARC alignment/reporting. Obtain actual record values from approved provider configuration; none are invented or installed here |
| Quotas/billing | Verify account/domain sending approval, daily/monthly quotas, team-wide rate allocation, spending alerts and a hard operational pause threshold. Published generic limits are not account approval |
| Ownership | Product owner approves templates/cutover/recipient policy; security owns keys/admission; billing owns account/budget; operations owns lag, callbacks, incident response and support. Name responsible people before rollout |

Keep test and live keys/accounts, databases, webhook destinations/secrets, instance identities, sender identities and witness namespaces distinct. Test-mode provider restrictions and real inbox behavior require actual account confirmation. Do not copy production customer destinations into fixtures. Do not log credentials, destinations, message bodies, tokens or full provider errors. No open/click tracking is implemented; independently confirm provider tracking defaults before any approved integration.

Provider contracts reviewed: [send email](https://resend.com/docs/api-reference/emails/send-email), [retrieve by email ID](https://resend.com/docs/api-reference/emails/retrieve-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [rate limits](https://resend.com/docs/api-reference/rate-limit), [signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [Svix verification](https://docs.svix.com/receiving/verifying-payloads/how). Actual account settings/capabilities are unverified.

## Scheduling and initial capacity proposal

The engineering `notificationTick` admits one intention, obtains a short fenced coordinator lease, and returns the persisted next wake time. It checks the shared permit before invoking the expensive dispatch path. A caller, not the worker function, waits until that time. There is no sleeping retry loop inside a processor and no installed timer/Cron.

Propose a dedicated bounded worker/coordinator with wakeups at persisted queue/permit deadlines, conservative one request/second team allocation and at most two in-flight requests, initially one active coordinator. Proposed invocation limit: 20 seconds admission work, one I/O request per tick, at most 20 admitted intentions per execution; actual throughput depends on latency/rate/eligibility and can be much lower. A once-per-minute Cron is not a claim of 20 sends/minute; if used later it should only trigger bounded work with reviewed budget and lag acceptance. A durable wakeup mechanism or dedicated worker is a separate deployment choice.

Initial target for approval: urgent due queue p95 under 5 minutes; standard under 15 minutes; alert at 10/30 minutes respectively, immediately on uncertain dispatch/restore rejection or required-notice lead-time risk. These are proposed SLOs, not achieved inbox guarantees. Stop admissions on exhausted budget, DB errors, missing identity keys, provider authentication/configuration failure, failed restore checks or webhook reconciliation backlog. Honor provider Retry-After; park beyond 23-hour safety deadline. Do not spin on every future item or retry by clearing its deadline.

Proposed dedicated worker pool ceiling: 6 application connections plus 2 reconciliation connections per worker deployment, with total regional budget established against Neon limits and other application functions. The current generic Prisma client uses the PostgreSQL adapter's default pool configuration; no six-connection production limit has been installed. The compiled benchmark's memory includes fixtures and in-process mocks and is not a Vercel function sizing recommendation. Production still needs bounded queue/lease query EXPLAINs and realistic multi-instance tests, scheduling outage/long-backlog tests, and scalable incremental admission instead of N-C's full history comparison before each send.

## Independently durable restore admission design

Use an approved append-only witness outside the application PostgreSQL/backup/cloud-account restore boundary, with separate credentials/ownership, immutable retention, encryption and independent key management. An object-lock store or independently managed log is a design option, not a provisioned service. No provider has been chosen or paid for. Do not rely on a flag or the application queue's own backup.

Before an actual dispatch, persist immutable intent in the application and require an independently durable witness acknowledgment binding provider account/environment, stable provider key, encrypted-envelope hash, destination fingerprint/version, app instance and attempt. Missing acknowledgment blocks I/O. Mirror acceptance/UNKNOWN outcomes, authenticated callback digests, suppression obligations and reviewed replacement links. Retain minimal opaque IDs/hashes, not email/body/ZIP content. Sign a monotonic checkpoint/watermark; reconcile gaps without assuming timestamp commit order. An uncertain intent remains uncertain even when absent from a provider lookup. Provider's 24-hour key expiry is not permission to forget history.

Every restore starts with no send admission. Compare the external witness and provider's actual message/event evidence against local frozen generations/attempts/suppressions; account for all uncertain/accepted intents and callbacks, rebuild suppressions, resolve conflicts and verify snapshot/key continuity. A separately authorized operator reviews unresolved cases. Issue a short-lived instance/account/deployment-bound admission tied to the external checkpoint and revocable by an external authority. Continue incremental acknowledgment checks before dispatch. Database-local writes cannot self-admit a restored instance. Establish whole-account disaster recovery, independent access review, witness unavailability behavior and retention before implementation approval.

`LocalRestoreWitness` exercises chained HMAC/fsync append and stale-checkpoint rejection outside a database snapshot. It is a bounded single-process fixture, not WORM storage, distributed coordination, anti-truncation protection, external authority or production admission. The application worker is not wired to it as a live safeguard; no live worker exists. N-C's actual PostgreSQL restore drill remains a separate local fake-ledger check. Neither fixture proves independently durable whole-environment recovery.

## Monitoring and incidents

Track due/oldest urgent and standard lag, next deadline, accepted versus delivered/bounced/complained, UNKNOWN age/count, rate deferrals, auth/validation/protocol/transport failures, lease expiration, webhook signature failures and pending/quarantined/conflicting events, unmatched IDs, suppression-key gaps, restored instance blocks and unresolved required notices. Use content-free identifiers and approved log retention. Health UI reports live account/domain status as unverified, never infers it from HTTP mocks. Existing role/MFA/audit restrictions still apply.

- Provider auth/config failure: pause admissions, validate approved scope and key rotation with an authorized operator; preserve all intents, never mass replay.
- 429/outage: honor deadlines/backoff, keep queue bounded, monitor lag; UNKNOWN calls reconcile independently, no blind retry or force-send.
- Webhook outage: return retryable failure before durable persistence; after persistence replay safely. Review signature/key rotation, account mapping and conflicting evidence; never mark accepted as delivered.
- Bounce/complaint: atomic suppression, investigate sender/template/list policy; removal requires approved review, not a retry switch.
- Restore/witness gap: fail closed, quarantine the instance, preserve evidence and reconcile; renaming an instance or restoring an old queue cannot authorize sends.
- Required notice gap: escalate to authorized legal/product review, block downstream actions; administrator resolution cannot fabricate delivery.

## Separately approved disposable-inbox acceptance

All unchecked; none performed in N-D. Obtain explicit approval before provisioning or sending.

1. Identify dedicated test account/domain, exact allowed disposable recipients, capped send count/budget, verified DNS and mailbox ownership; no customer recipients.
2. Approve environment/instance/database separation, server-only credentials, independent witness/recovery and code/release change permitting real I/O. Current N-D cannot be enabled with environment settings.
3. Verify actual send and retrieve response contracts, API permission scope, hidden retries/timeouts, stable key/body behavior, safe-window expiration and account-wide quota sharing.
4. Register the exact central HTTPS POST webhook and test real raw-byte signatures, rotation, delivery/replays, early/out-of-order callbacks, deliberately induced storage outage and durable replay recovery.
5. Capture provider acceptance and actual mailbox/server evidence separately. Test permitted bounce/complaint scenarios safely; verify suppression and no arbitrary resend. Never generate spam complaints against real unrelated recipients.
6. Complete real signed-in Super/Billing/Support MFA, revocation and role isolation; verify bodies/destinations remain absent from UI/logs and sensitive links retain authorization.
7. Test old application restore with external history, unknown outcomes and suppression recovery; review independent attestation before any send admission.
8. Approve the template catalog, history cutover, retention and notice policy. Keep EXPORT_AVAILABLE blocked until separately approved N-X. Stop and review evidence before customer rollout.
