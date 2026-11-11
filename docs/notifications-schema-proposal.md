# Notification schema and index proposal — N-A

10 November follow-up: [N-B isolated implementation and acceptance](notifications-checkpoint-nb.md) records the implemented schema refinements, capture-only tests and remaining gates. The N-A proposal below is retained as historical design evidence.

9 November 2026. **Review sketch only.** These models are not in `prisma/schema.prisma`, generated clients or migrations. The [architecture](notifications-checkpoint-na.md) defines the state machine, recipient matrix and release gates. Final implementation must add existing-model inverse relations, source consistency triggers and approved retention policies, then rehearse migrations before use.

## Why these records

Four delivery records from the brief are necessary: outbox, actual attempts, provider evidence and runs. Four supporting records close distinct gaps:

1. `NotificationSource` records discovery/disposition even when an event is audit-only, has no eligible recipients, or has not yet been materialized. Without it, outbox-only anti-joins lose these distinctions or repeatedly rediscover them.
2. `LifecycleNotice` is the single required-notice obligation, linked to recipient-specific intents and actual evidence. No such model currently exists.
3. `NotificationSuppression` prevents known invalid/complaining destinations from being retried across sends; it is not marketing preference.
4. `NotificationControl` stores approved kind/channel controls and shared rate/worker coordination. Credentials stay in server-only environment secrets.

Defer a template table (use immutable approved code versions), preference table (no approved optional preferences yet), message broker, separate delivery ledger and separate raw-event log. Provider-event storage is the inbox/evidence record. Existing `PlatformAuditEvent` records administrator changes; do not invent a platform admin for Cron.

## Proposed Prisma sketch

String kind/policy/template fields are **closed registries**, not caller-defined values. Implementation must validate them and add SQL allowlists/checks as described below. The business event payload remains content-free; encrypted provider payload exists only on its recipient-specific outbox row.

```prisma
enum NotificationScope {
  TENANT
  ACCOUNT
  PLATFORM
}

enum NotificationSourceState {
  PENDING
  WAITING_FOR_TRANSITION
  WAITING_FOR_RECIPIENT
  RESOLVED
  AUDIT_ONLY
  HISTORICAL_REVIEW
  REVIEW_REQUIRED
}

enum NotificationProcessingState {
  PENDING
  CLAIMED
  RETRY_PENDING
  SETTLED
  SUPPRESSED
  CANCELED
  MANUAL_REVIEW
}

enum NotificationDeliveryOutcome {
  NOT_SENT
  UNKNOWN
  PROVIDER_ACCEPTED
  DELIVERED_TO_SERVER
  DELAYED
  BOUNCED
  COMPLAINED
  FAILED
}

enum NotificationAttemptResult {
  DISPATCH_INTENT
  ACCEPTED
  KNOWN_REJECTED
  RATE_LIMITED
  UNKNOWN
}

enum NotificationProviderEventState {
  VERIFIED_PENDING
  APPLIED
  QUARANTINED
}

enum LifecycleNoticeState {
  OPEN
  SATISFIED_UNDER_POLICY
  REVIEW_REQUIRED
  RESOLVED_BY_REVIEW
}

model NotificationSource {
  id                 String @id @default(cuid())
  canonicalKey       String @unique
  scope              NotificationScope
  kind               String
  workspaceId        String?
  workspace          Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  subjectUserId      String?
  subjectUser        User? @relation(fields: [subjectUserId], references: [id], onDelete: Restrict)
  lifecycleEventId   String? @unique
  lifecycleEvent     WorkspaceLifecycleEvent? @relation(fields: [lifecycleEventId], references: [id], onDelete: Restrict)
  requestId          String?
  request            SubscriptionRequest? @relation(fields: [requestId], references: [id], onDelete: Restrict)
  paymentId          String?
  payment            SubscriptionPayment? @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  receiptId          String?
  receipt            SubscriptionPaymentReceipt? @relation(fields: [receiptId], references: [id], onDelete: Restrict)
  reversalId         String?
  reversal           SubscriptionPaymentReversal? @relation(fields: [reversalId], references: [id], onDelete: Restrict)
  periodId           String?
  period             SubscriptionPeriod? @relation(fields: [periodId], references: [id], onDelete: Restrict)
  auditLogId         String?
  auditLog           AuditLog? @relation(fields: [auditLogId], references: [id], onDelete: Restrict)
  accountOperationId String? @unique
  incidentKey        String?
  effectiveAt        DateTime
  recordedAt         DateTime @default(now())
  scheduledAt        DateTime?
  latestSendAt       DateTime?
  policyVersion      String
  state              NotificationSourceState @default(PENDING)
  nextReconcileAt    DateTime?
  leaseToken         String?
  leaseUntil         DateTime?
  dispositionCode    String?
  notice             LifecycleNotice?
  notifications      NotificationOutbox[]

  @@index([workspaceId, effectiveAt])
  @@index([subjectUserId, effectiveAt])
  @@index([state, nextReconcileAt, id])
}

model LifecycleNotice {
  id                     String @id @default(cuid())
  sourceId               String @unique
  source                 NotificationSource @relation(fields: [sourceId], references: [id], onDelete: Restrict)
  obligationKey          String @unique
  milestone              String
  dueAt                  DateTime
  minimumLeadDeadlineAt  DateTime?
  recipientPolicyVersion String
  evidencePolicyVersion  String
  required               Boolean
  state                  LifecycleNoticeState @default(OPEN)
  resolvedByAdminId      String?
  resolvedBy             PlatformAdmin? @relation(fields: [resolvedByAdminId], references: [id], onDelete: Restrict)
  resolvedAt             DateTime?
  resolutionReason      String?
  evidenceReference     String?
  notifications         NotificationOutbox[]
  createdAt             DateTime @default(now())

  @@index([state, dueAt])
}

model NotificationOutbox {
  id                     String @id @default(cuid())
  sourceId               String
  source                 NotificationSource @relation(fields: [sourceId], references: [id], onDelete: Restrict)
  noticeId               String?
  notice                 LifecycleNotice? @relation(fields: [noticeId], references: [id], onDelete: Restrict)
  recipientUserId        String
  recipientUser          User @relation(fields: [recipientUserId], references: [id], onDelete: Restrict)
  kind                   String
  channel                String @default("EMAIL")
  templateVersion        String
  templateDigest         String
  recipientPolicyVersion String
  logicalKey             String
  generation             Int @default(1)
  replacesId             String?
  replaces               NotificationOutbox? @relation("NotificationReplacement", fields: [replacesId], references: [id], onDelete: Restrict)
  replacements           NotificationOutbox[] @relation("NotificationReplacement")
  scheduledAt            DateTime
  latestSendAt           DateTime?
  priority               Int
  processingState        NotificationProcessingState @default(PENDING)
  deliveryOutcome        NotificationDeliveryOutcome @default(NOT_SENT)
  leaseToken             String?
  leaseUntil             DateTime?
  version                Int @default(1)
  dispatchedAttempts     Int @default(0)
  nextAttemptAt          DateTime?
  firstDispatchedAt      DateTime?
  safeRetryUntil         DateTime?
  providerScope          String
  providerKey            String @unique
  providerMessageId      String?
  frozenPayloadCipher    Bytes?
  payloadKeyVersion      String?
  payloadHash            String?
  destinationDigest      String?
  identityBindingDigest  String?
  recipientVerifiedAt    DateTime?
  acceptedAt             DateTime?
  deliveredAt            DateTime?
  bouncedAt              DateTime?
  complainedAt           DateTime?
  lastFailureCode        String?
  completedAt            DateTime?
  createdAt              DateTime @default(now())
  attempts               NotificationDeliveryAttempt[]
  providerEvents         NotificationProviderEvent[]

  @@unique([logicalKey, generation])
  @@unique([providerScope, providerMessageId])
  @@unique([id, providerScope])
  @@unique([id, providerScope, providerKey, payloadHash])
  @@index([processingState, nextAttemptAt, scheduledAt, priority, id])
  @@index([sourceId, recipientUserId])
  @@index([recipientUserId, createdAt])
}

model NotificationDeliveryAttempt {
  id               String @id @default(cuid())
  notificationId   String
  providerScope    String
  providerKey      String
  payloadHash      String
  notification     NotificationOutbox @relation(fields: [notificationId, providerScope, providerKey, payloadHash], references: [id, providerScope, providerKey, payloadHash], onDelete: Restrict, onUpdate: Restrict)
  runId            String?
  run              NotificationRun? @relation(fields: [runId], references: [id], onDelete: Restrict)
  attemptNo        Int
  leaseToken       String
  dispatchedAt     DateTime
  completedAt      DateTime?
  result           NotificationAttemptResult @default(DISPATCH_INTENT)
  responseCategory String?
  providerMessageId String?
  retryEligible    Boolean @default(false)
  providerEvents   NotificationProviderEvent[]

  @@unique([notificationId, attemptNo])
  @@unique([id, notificationId])
  @@index([providerScope, providerMessageId])
  @@index([result, dispatchedAt])
}

model NotificationProviderEvent {
  id                 String @id @default(cuid())
  providerScope      String
  providerEventId    String
  providerMessageId  String?
  notificationId     String?
  notification       NotificationOutbox? @relation(fields: [notificationId, providerScope], references: [id, providerScope], onDelete: Restrict)
  attemptId          String?
  attempt            NotificationDeliveryAttempt? @relation(fields: [attemptId, notificationId], references: [id, notificationId], onDelete: Restrict)
  eventType          String
  occurredAt         DateTime?
  receivedAt         DateTime @default(now())
  verifiedAt         DateTime
  verificationKeyRef String
  bodyDigest         String
  destinationDigest  String?
  state              NotificationProviderEventState @default(VERIFIED_PENDING)
  failureCode        String?
  processedAt        DateTime?
  evidenceCipher     Bytes?
  evidenceKeyVersion String?
  evidenceExpiresAt  DateTime?
  suppressions       NotificationSuppression[]

  @@unique([providerScope, providerEventId])
  @@index([providerScope, providerMessageId])
  @@index([state, receivedAt])
  @@index([evidenceExpiresAt])
}

model NotificationRun {
  id               String @id @default(cuid())
  dryRun           Boolean
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  leaseToken       String
  eligibleCount    Int @default(0)
  processedCount   Int @default(0)
  retryCount       Int @default(0)
  failedCount      Int @default(0)
  skippedCount     Int @default(0)
  failureCode      String?
  summary          Json?
  attempts         NotificationDeliveryAttempt[]

  @@index([startedAt])
  @@index([completedAt])
}

model NotificationSuppression {
  id                String @id @default(cuid())
  providerScope     String
  channel           String @default("EMAIL")
  destinationDigest String
  digestKeyVersion  String
  reasonCode        String
  providerEventId   String?
  providerEvent     NotificationProviderEvent? @relation(fields: [providerEventId], references: [id], onDelete: Restrict)
  active            Boolean @default(true)
  createdAt         DateTime @default(now())
  reviewAt          DateTime?
  releasedAt        DateTime?
  releaseReason     String?

  @@unique([providerScope, channel, digestKeyVersion, destinationDigest])
  @@index([active, reviewAt])
}

model NotificationControl {
  key              String @id
  enabled          Boolean @default(false)
  configRevision   Int @default(1)
  policyVersion    String
  settings         Json
  pauseUntil       DateTime?
  nextPermitAt     DateTime?
  workerLeaseToken String?
  workerLeaseUntil DateTime?
  updatedAt        DateTime @updatedAt
}
```

## Required database invariants beyond the sketch

1. **Scope:** TENANT requires workspace ID; ACCOUNT requires subject user and no workspace; PLATFORM permits no tenant/account reference unless a separately approved scoped incident policy says otherwise. Mandatory source-pointer combinations are checked per closed kind. No generic unvalidated polymorphic ID.
2. **Tenant ownership:** source FK IDs must exist and match the declared workspace. Use tenant compound FKs where the parent supports them; otherwise add the corresponding unique pair or a strict SQL consistency trigger with stable source validation. Validate reversal → receipt → workspace; lifecycle event → episode/export/recovery → workspace; audit → workspace. Nulls must not bypass these checks.
3. **Single inherited scope:** outbox/attempt/provider evidence inherit workspace/account scope through their immutable parent, rather than duplicating nullable workspace columns everywhere. A notice-linked outbox must reference the same source as its notice; enforce with a composite relation or SQL trigger. Do not depend on a nullable composite FK alone: PostgreSQL MATCH SIMPLE can skip a check when one component is null.
4. **Logical uniqueness:** logical key uses canonical business intent, notification kind and logical recipient/channel. Template version and retry attempt are excluded. One automatic generation; replacement requires reviewed linkage. Add a partial unique index preventing simultaneously actionable generations for one logical key.
5. **Attempt integrity:** the attempt's provider scope/key/payload hash must match the frozen outbox generation. The provider key is intentionally reused across multiple attempts; it is not unique in the attempt table. `ON UPDATE RESTRICT` prevents rewriting history through FK cascade.
6. **Payload immutability:** after freezing/first dispatch, block edits to identity/destination, provider scope/key, template bytes/digest and payload hash. Permit authorized ciphertext redaction after its approved retention while preserving minimal evidence. A replacement is a new linked generation, not an edit to an old attempted message.
7. **Provider mapping:** provider account/environment + message ID maps to at most one outbox. Verify event destination/account against its frozen generation before association. `attemptId` requires a non-null matching `notificationId`; APPLIED delivery evidence requires a valid message ID, occurrence time and matching destination. Unknown/malformed verified events remain quarantined/unmatched, never assigned fabricated values to satisfy the schema.
8. **Time/state checks:** positive generation/attempt/version values; nonnegative run counts; expiry after claim/dispatch; dispatch cannot be counted as acceptance/delivery; recipient verification before dispatch; safe retry deadline capped below the provider's 24-hour window. Preserve original facts through later cancellations/out-of-order events.
9. **Required notice:** one obligation per workspace episode/milestone/policy. `RESOLVED_BY_REVIEW` requires authorized actor/time/reason/evidence. It is not a fabricated delivered outcome. Evidence coverage uses recipient-specific intents and verified evidence under approved lead-time policy.
10. **Suppressions:** normalized destination fingerprint is a purpose-separated keyed HMAC, not a plaintext email or guessable unkeyed email hash. Retain key version and reconcile active older-version fingerprints during rotation. Candidate checks must compute fingerprints under all still-active lookup-key versions or use an approved provider-evidence migration; dropping an old lookup key cannot silently remove its active suppressions. Current suppression resolution should consult provider evidence; no new duplicate active row should bypass the original suppression on key rotation.
11. **Controls:** whitelisted keys/kinds and validated settings only; no credentials, arbitrary templates or destination input. Environment kill switch overrides database enablement. Administrative edits commit an existing `PlatformAuditEvent` with role/MFA rechecks and reason.
12. **Audit/privacy:** reject unauthorized mutation of verified event identity/digest and attempt snapshots. Add bounded JSON/evidence/payload sizes. No cascading removal of customer Users, business records or legal evidence. Any retention cleanup remains category/purpose specific, not automatic tenant purge.

## Index plan and query contract

In addition to Prisma indexes, propose partial indexes for due actionable outbox rows, expired CLAIMED leases, unresolved verified provider events, required notice review deadlines and nonterminal source reconciliation. Order due claims by lane/deadline/age with `LIMIT` and `SKIP LOCKED`; capture actual plans under load rather than assuming a broad composite index alone covers every branch.

Add lookup indexes on relevant source reference IDs and legacy audit `(action, resourceType, resourceId)` only after measuring adapter queries. Existing lifecycle-event anti-joins can use its primary key against unique `NotificationSource.lifecycleEventId`; repeated bounded gap scans must cover all IDs independently of recorded-time ordering. Commercial reconciliation needs bounded NOT EXISTS queries against canonical source keys/typed references.

Unique `providerMessageId` does not mean delivery, and a unique event body hash alone is insufficient deduplication: identity is provider scope + authenticated event ID, with digest mismatch handled as a conflict. Legal-obligation lists must not scan decrypted email bodies.

## Existing-model extensions requiring implementation approval

- Add inverse relation arrays to Workspace, User, WorkspaceLifecycleEvent, SubscriptionRequest, SubscriptionPayment, SubscriptionPaymentReceipt, SubscriptionPaymentReversal, SubscriptionPeriod, AuditLog and PlatformAdmin.
- Add tenant identity pairs only where required for selected compound FKs; preserve all current financial/assignment constraints and immutable histories.
- Add a nullable `AuditLog.subjectUserId` captured before membership removal if affected-user security notices are approved. It is a recipient reference, not authority to access a workspace.
- A global app-owned account-security source needs a canonical operation ID inserted inside the actual verified identity mutation transaction; current per-workspace `IDENTITY_EMAIL_UPDATED` audits cannot be assumed to supply it. Do not implement this trigger until Clerk/application responsibility is approved.
- For a scheduled archive/cancel source, allow an initially missing lifecycle-event reference only in WAITING_FOR_TRANSITION; attach the matching committed event idempotently and verify the period/workspace. Other event-backed sources require their event from creation.

## Migration and verification plan

Future N-B: forward-only additive migrations, all delivery controls false, no automatic historical-email backfill. Start with empty and restored populated rehearsal databases, preserving fingerprints for existing identity, workspace, commercial, lifecycle and C export/recovery records. Verify schema drift plus raw SQL checks/indexes, null-scope cases, source-pointer corruption, immutable snapshots, duplicates, rollback and concurrency. No production or preview execution is authorized here.

Separate migrations should cover queue/source tables, provider evidence/control refinements and any approved security-subject extension. Keep N-X artifact/token lifetime changes independent. On rollback, disable external sending first, preserve unknown sends/provider evidence, and forward-fix; dropping the queue or rerunning old events without its dedup history can duplicate messages. Restored environments must be quarantined from sending until provider-message/dedup history is reconciled, independently of future D deletion reconciliation.

The sketch is not a final validated migration and must not be copied blindly into a live schema. N-A approval should settle model boundaries/invariants first; implementation then supplies the complete inverse relations, tests and pinned-Prisma migration evidence.
