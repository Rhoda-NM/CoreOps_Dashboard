# Export and recovery notification integration contract

9 November 2026. Implemented event contract for isolated Checkpoint C. **No notification outbox, email provider, delivery worker or delivered-message record exists.** See [acceptance and limits](data-lifecycle-checkpoint-c.md).

Design follow-up: [Notification Service N-A architecture](notifications-checkpoint-na.md) and [schema proposal](notifications-schema-proposal.md). These are review documents only; this implemented event contract and C's current export TTL remain unchanged.

## Durable envelope

Source: `WorkspaceLifecycleEvent`. Preserve the existing event ID, type, workspace ID, episode ID, effective timestamp, recorded timestamp, policy version and unique operation key. C adds optional `exportId` and `recoveryId` references. SQL checks require the appropriate reference for C event kinds and prohibit them on B archive/cancellation/reactivation events. Compound foreign keys enforce same-workspace references.

The envelope contains identifiers and times only, never customer record contents, email addresses, invitation/download tokens, ZIP bytes, credentials, evidence documents or review text. Lookup of private request data is a separate authorized server operation. Events commit in the same transaction as the change they describe. Update immutability and operation-key matching reject inconsistent retries; database-owner/backup tamper resistance is not claimed.

| Event type | Operation key | Meaning / potential recipient |
| --- | --- | --- |
| `EXPORT_REQUESTED` | `<exportId>:EXPORT_REQUESTED` | Authorized request accepted; requester |
| `EXPORT_READY` | `<exportId>:EXPORT_READY` | Complete encrypted artifact committed; requester, after rechecking current authority and TTL |
| `EXPORT_FAILED` | `<exportId>:EXPORT_FAILED` | Generation failed and sanitized failure state committed; requester |
| `EXPORT_EXPIRED` | `<exportId>:EXPORT_EXPIRED` | Request/artifact TTL or processing lease expired and ciphertext cleared; requester if useful |
| `EXPORT_DOWNLOAD_AUTHORIZED` | `<exportId>:EXPORT_DOWNLOAD_AUTHORIZED` (C legacy); `<authorizationId>:EXPORT_DOWNLOAD_AUTHORIZED` (N-X) | Single-use authorization consumed; **not proof that the browser saved or received every byte** |
| `RECOVERY_REQUESTED` | `<recoveryId>:RECOVERY_REQUESTED` | Verified claimant requested independent review; claimant and authorized review queue |
| `RECOVERY_APPROVED` | `<recoveryId>:RECOVERY_APPROVED` | Selected short-lived scopes granted; claimant after verifying grant is still valid |
| `RECOVERY_REJECTED` | `<recoveryId>:RECOVERY_REJECTED` | No access granted; claimant |
| `RECOVERY_REVOKED` | `<recoveryId>:RECOVERY_REVOKED` | Grant withdrawn and dependent unused artifacts invalidated; claimant/review queue as appropriate |
| `RECOVERY_GRANT_EXPIRED` | `<recoveryId>:RECOVERY_GRANT_EXPIRED` | Expired scope materialized; effective time is the original grant deadline, recorded time is observation |
| `WORKSPACE_RESTORED` | `<recoveryId>:WORKSPACE_RESTORED` | Existing funded SUPER_ADMIN activation consumed a reviewed grant and restored paid access; reviewed claimant/current authorized owners under a future recipient policy |

Existing B `WORKSPACE_ARCHIVED`, `WORKSPACE_CANCELED`, `WORKSPACE_REACTIVATED` events remain intact. `WORKSPACE_REACTIVATED` denotes an archive renewal; `WORKSPACE_RESTORED` denotes the separately reviewed post-cancellation path. Neither means a notification was delivered.

Security denials do not create an `EXPORT_FAILED` event for arbitrary/foreign requests. A request losing authority can remain non-downloadable until cleanup records expiration. Repeated request/preparation, cleanup and activation retries do not create duplicate transition events.

## Consumer requirements for the forthcoming service

1. Discover committed events with a durable outbox/processing record uniquely keyed by event ID and notification kind/recipient/channel. **Do not use a recorded-time-only watermark**: commit order can differ from timestamp order. Periodically reconcile committed events without processing records.
2. Claim work transactionally; use leases, bounded attempts, idempotent provider keys, retry/backoff and sanitized failure observability. Creating a pending delivery is not delivery evidence.
3. Resolve recipients from current verified identity and the scoped request, never from an email or URL in event metadata. Account/binding conflicts require review; never relink an account to send a message.
4. Recheck state immediately before sending. Suppress or replace stale ready/approval notices when an artifact/grant expired, was consumed/revoked, or a lifecycle/ownership change removed authority. Never send ZIP attachments or download tokens; link to the configured central account application so live authentication and MFA still apply.
5. Keep transactional notices separate from marketing consent. Messages must not contain client details, amounts, identity-provider IDs, membership history, internal review reasons or ownership evidence references.
6. Record provider acceptance, delivery, bounce and failure as distinct states using actual provider evidence. Authenticate/deduplicate callbacks before changing delivery status. Do not equate provider acceptance with delivery.
7. Approve recipient rules, templates, sender identity, retention, support procedures and provider configuration separately. Missing notification infrastructure must continue to block live lifecycle rollout/deletion readiness; C does not remove that gate.

This contract prepares integration. It does not authorize email transmission, promotional messaging, a new provider connection or Checkpoint D.

## N-X compatibility follow-up

N-X keeps the envelope and event types. New v2 artifact availability begins at successful generation, at most 24 hours; each independent authorization expires after at most five minutes and never later than artifact/recovery authority. Repeated authorized attempts have distinct authorization-based operation keys; old event keys are unchanged. Download events remain audit-only, with no assertion of file receipt. Ready relevance uses actual availability and requires at least 30 minutes of useful artifact/grant time. A notification never extends a grant or carries an artifact/token. Outbound EXPORT_AVAILABLE remains disabled in controls, worker and SQL. See the N-X acceptance report for implementation/evidence.
