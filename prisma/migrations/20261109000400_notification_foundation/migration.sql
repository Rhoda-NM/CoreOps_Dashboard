-- CreateEnum
CREATE TYPE "NotificationScope" AS ENUM ('TENANT', 'ACCOUNT', 'PLATFORM');

-- CreateEnum
CREATE TYPE "NotificationSourceState" AS ENUM ('PENDING', 'WAITING_FOR_TRANSITION', 'WAITING_FOR_RECIPIENT', 'RESOLVED', 'AUDIT_ONLY', 'HISTORICAL_REVIEW', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationProcessingState" AS ENUM ('PENDING', 'CLAIMED', 'RETRY_PENDING', 'SETTLED', 'SUPPRESSED', 'CANCELED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "NotificationDeliveryOutcome" AS ENUM ('NOT_SENT', 'UNKNOWN', 'PROVIDER_ACCEPTED', 'DELIVERED_TO_SERVER', 'DELAYED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationAttemptResult" AS ENUM ('CAPTURE_INTENT', 'CAPTURE_ABANDONED', 'CAPTURED', 'DISPATCH_INTENT', 'ACCEPTED', 'KNOWN_REJECTED', 'RATE_LIMITED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NotificationProviderEventState" AS ENUM ('VERIFIED_PENDING', 'APPLIED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "LifecycleNoticeState" AS ENUM ('OPEN', 'SATISFIED_UNDER_POLICY', 'REVIEW_REQUIRED', 'RESOLVED_BY_REVIEW');

-- CreateTable
CREATE TABLE "NotificationSource" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "scope" "NotificationScope" NOT NULL,
    "kind" TEXT NOT NULL,
    "workspaceId" TEXT,
    "subjectUserId" TEXT,
    "lifecycleEventId" TEXT,
    "requestId" TEXT,
    "paymentId" TEXT,
    "receiptId" TEXT,
    "reversalId" TEXT,
    "periodId" TEXT,
    "auditLogId" TEXT,
    "platformAuditId" TEXT,
    "milestone" TEXT,
    "accountOperationId" TEXT,
    "incidentKey" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "latestSendAt" TIMESTAMP(3),
    "policyVersion" TEXT NOT NULL,
    "state" "NotificationSourceState" NOT NULL DEFAULT 'PENDING',
    "nextReconcileAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "dispositionCode" TEXT,

    CONSTRAINT "NotificationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleNotice" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "obligationKey" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "minimumLeadDeadlineAt" TIMESTAMP(3),
    "recipientPolicyVersion" TEXT NOT NULL,
    "evidencePolicyVersion" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "state" "LifecycleNoticeState" NOT NULL DEFAULT 'OPEN',
    "resolvedByAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionReason" TEXT,
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "noticeId" TEXT,
    "recipientUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "templateVersion" TEXT NOT NULL,
    "templateDigest" TEXT NOT NULL,
    "recipientPolicyVersion" TEXT NOT NULL,
    "logicalKey" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "replacesId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "latestSendAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL,
    "processingState" "NotificationProcessingState" NOT NULL DEFAULT 'PENDING',
    "deliveryOutcome" "NotificationDeliveryOutcome" NOT NULL DEFAULT 'NOT_SENT',
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "dispatchedAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "firstDispatchedAt" TIMESTAMP(3),
    "safeRetryUntil" TIMESTAMP(3),
    "providerScope" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "captureAttempts" INTEGER NOT NULL DEFAULT 0,
    "captureId" TEXT,
    "frozenPayloadCipher" BYTEA,
    "payloadKeyVersion" TEXT,
    "payloadHash" TEXT,
    "destinationDigest" TEXT,
    "identityBindingDigest" TEXT,
    "recipientVerifiedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "lastFailureCode" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "mode" TEXT NOT NULL DEFAULT 'CAPTURE',
    "captureId" TEXT,
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "providerScope" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "runId" TEXT,
    "attemptNo" INTEGER NOT NULL,
    "leaseToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" "NotificationAttemptResult" NOT NULL DEFAULT 'DISPATCH_INTENT',
    "responseCategory" TEXT,
    "providerMessageId" TEXT,
    "retryEligible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationProviderEvent" (
    "id" TEXT NOT NULL,
    "providerScope" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "notificationId" TEXT,
    "attemptId" TEXT,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "verificationKeyRef" TEXT NOT NULL,
    "bodyDigest" TEXT NOT NULL,
    "destinationDigest" TEXT,
    "state" "NotificationProviderEventState" NOT NULL DEFAULT 'VERIFIED_PENDING',
    "failureCode" TEXT,
    "processedAt" TIMESTAMP(3),
    "evidenceCipher" BYTEA,
    "evidenceKeyVersion" TEXT,
    "evidenceExpiresAt" TIMESTAMP(3),

    CONSTRAINT "NotificationProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRun" (
    "id" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "leaseToken" TEXT NOT NULL,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "summary" JSONB,

    CONSTRAINT "NotificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSuppression" (
    "id" TEXT NOT NULL,
    "providerScope" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "destinationDigest" TEXT NOT NULL,
    "digestKeyVersion" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "providerEventId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "NotificationSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationControl" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "captureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discoveryCursor" INTEGER NOT NULL DEFAULT 0,
    "configRevision" INTEGER NOT NULL DEFAULT 1,
    "policyVersion" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "pauseUntil" TIMESTAMP(3),
    "nextPermitAt" TIMESTAMP(3),
    "workerLeaseToken" TEXT,
    "workerLeaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationControl_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSource_canonicalKey_key" ON "NotificationSource"("canonicalKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSource_lifecycleEventId_key" ON "NotificationSource"("lifecycleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSource_platformAuditId_key" ON "NotificationSource"("platformAuditId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSource_accountOperationId_key" ON "NotificationSource"("accountOperationId");

-- CreateIndex
CREATE INDEX "NotificationSource_workspaceId_effectiveAt_idx" ON "NotificationSource"("workspaceId", "effectiveAt");

-- CreateIndex
CREATE INDEX "NotificationSource_subjectUserId_effectiveAt_idx" ON "NotificationSource"("subjectUserId", "effectiveAt");

-- CreateIndex
CREATE INDEX "NotificationSource_state_nextReconcileAt_id_idx" ON "NotificationSource"("state", "nextReconcileAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleNotice_sourceId_key" ON "LifecycleNotice"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleNotice_obligationKey_key" ON "LifecycleNotice"("obligationKey");

-- CreateIndex
CREATE INDEX "LifecycleNotice_state_dueAt_idx" ON "LifecycleNotice"("state", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_providerKey_key" ON "NotificationOutbox"("providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_captureId_key" ON "NotificationOutbox"("captureId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_processingState_nextAttemptAt_scheduledA_idx" ON "NotificationOutbox"("processingState", "nextAttemptAt", "scheduledAt", "priority", "id");

-- CreateIndex
CREATE INDEX "NotificationOutbox_sourceId_recipientUserId_idx" ON "NotificationOutbox"("sourceId", "recipientUserId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_recipientUserId_createdAt_idx" ON "NotificationOutbox"("recipientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_logicalKey_generation_key" ON "NotificationOutbox"("logicalKey", "generation");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_providerScope_providerMessageId_key" ON "NotificationOutbox"("providerScope", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_id_providerScope_key" ON "NotificationOutbox"("id", "providerScope");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_id_providerScope_providerKey_payloadHash_key" ON "NotificationOutbox"("id", "providerScope", "providerKey", "payloadHash");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_providerScope_providerMessageId_idx" ON "NotificationDeliveryAttempt"("providerScope", "providerMessageId");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_result_dispatchedAt_idx" ON "NotificationDeliveryAttempt"("result", "dispatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDeliveryAttempt_notificationId_attemptNo_key" ON "NotificationDeliveryAttempt"("notificationId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDeliveryAttempt_id_notificationId_key" ON "NotificationDeliveryAttempt"("id", "notificationId");

-- CreateIndex
CREATE INDEX "NotificationProviderEvent_providerScope_providerMessageId_idx" ON "NotificationProviderEvent"("providerScope", "providerMessageId");

-- CreateIndex
CREATE INDEX "NotificationProviderEvent_state_receivedAt_idx" ON "NotificationProviderEvent"("state", "receivedAt");

-- CreateIndex
CREATE INDEX "NotificationProviderEvent_evidenceExpiresAt_idx" ON "NotificationProviderEvent"("evidenceExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationProviderEvent_providerScope_providerEventId_key" ON "NotificationProviderEvent"("providerScope", "providerEventId");

-- CreateIndex
CREATE INDEX "NotificationRun_startedAt_idx" ON "NotificationRun"("startedAt");

-- CreateIndex
CREATE INDEX "NotificationRun_completedAt_idx" ON "NotificationRun"("completedAt");

-- CreateIndex
CREATE INDEX "NotificationSuppression_active_reviewAt_idx" ON "NotificationSuppression"("active", "reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSuppression_providerScope_channel_digestKeyVers_key" ON "NotificationSuppression"("providerScope", "channel", "digestKeyVersion", "destinationDigest");

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_lifecycleEventId_fkey" FOREIGN KEY ("lifecycleEventId") REFERENCES "WorkspaceLifecycleEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SubscriptionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SubscriptionPaymentReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_reversalId_fkey" FOREIGN KEY ("reversalId") REFERENCES "SubscriptionPaymentReversal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SubscriptionPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSource" ADD CONSTRAINT "NotificationSource_platformAuditId_fkey" FOREIGN KEY ("platformAuditId") REFERENCES "PlatformAuditEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleNotice" ADD CONSTRAINT "LifecycleNotice_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NotificationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleNotice" ADD CONSTRAINT "LifecycleNotice_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NotificationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "LifecycleNotice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "NotificationOutbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_notificationId_providerScope_p_fkey" FOREIGN KEY ("notificationId", "providerScope", "providerKey", "payloadHash") REFERENCES "NotificationOutbox"("id", "providerScope", "providerKey", "payloadHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "NotificationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationProviderEvent" ADD CONSTRAINT "NotificationProviderEvent_notificationId_providerScope_fkey" FOREIGN KEY ("notificationId", "providerScope") REFERENCES "NotificationOutbox"("id", "providerScope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationProviderEvent" ADD CONSTRAINT "NotificationProviderEvent_attemptId_notificationId_fkey" FOREIGN KEY ("attemptId", "notificationId") REFERENCES "NotificationDeliveryAttempt"("id", "notificationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSuppression" ADD CONSTRAINT "NotificationSuppression_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES "NotificationProviderEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

