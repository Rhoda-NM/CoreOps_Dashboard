-- CreateEnum
CREATE TYPE "WorkspaceExportStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'READY', 'FAILED', 'DOWNLOADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorkspaceRecoveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'EXPORT_REQUESTED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'EXPORT_READY';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'EXPORT_FAILED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'EXPORT_EXPIRED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'EXPORT_DOWNLOAD_AUTHORIZED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'RECOVERY_REQUESTED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'RECOVERY_APPROVED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'RECOVERY_REJECTED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'RECOVERY_REVOKED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'RECOVERY_GRANT_EXPIRED';
ALTER TYPE "WorkspaceLifecycleEventType" ADD VALUE 'WORKSPACE_RESTORED';

-- AlterTable
ALTER TABLE "WorkspaceLifecycleEvent" ADD COLUMN     "exportId" TEXT,
ADD COLUMN     "recoveryId" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceExportRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "sourcePeriodId" TEXT NOT NULL,
    "recoveryId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "WorkspaceExportStatus" NOT NULL DEFAULT 'REQUESTED',
    "schemaVersion" TEXT NOT NULL DEFAULT 'workspace-export-v1',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "leaseUntil" TIMESTAMP(3),
    "artifact" BYTEA,
    "artifactDigest" TEXT,
    "tokenHash" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRecoveryRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterExternalId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "sourcePeriodId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "claimReference" TEXT NOT NULL,
    "status" "WorkspaceRecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "evidenceReferences" TEXT,
    "reviewReason" TEXT,
    "identityCheckedAt" TIMESTAMP(3),
    "ownershipVerifiedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "allowExport" BOOLEAN NOT NULL DEFAULT false,
    "allowReactivation" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "activationPeriodId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceRecoveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceExportRequest_workspaceId_status_expiresAt_idx" ON "WorkspaceExportRequest"("workspaceId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceExportRequest_expiresAt_idx" ON "WorkspaceExportRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceExportRequest_requesterId_idempotencyKey_key" ON "WorkspaceExportRequest"("requesterId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceExportRequest_id_workspaceId_key" ON "WorkspaceExportRequest"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRecoveryRequest_activationPeriodId_key" ON "WorkspaceRecoveryRequest"("activationPeriodId");

-- CreateIndex
CREATE INDEX "WorkspaceRecoveryRequest_workspaceId_status_idx" ON "WorkspaceRecoveryRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceRecoveryRequest_expiresAt_idx" ON "WorkspaceRecoveryRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRecoveryRequest_requesterId_idempotencyKey_key" ON "WorkspaceRecoveryRequest"("requesterId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRecoveryRequest_id_workspaceId_key" ON "WorkspaceRecoveryRequest"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRecoveryRequest_activationPeriodId_workspaceId_key" ON "WorkspaceRecoveryRequest"("activationPeriodId", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_exportId_workspaceId_fkey" FOREIGN KEY ("exportId", "workspaceId") REFERENCES "WorkspaceExportRequest"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_recoveryId_workspaceId_fkey" FOREIGN KEY ("recoveryId", "workspaceId") REFERENCES "WorkspaceRecoveryRequest"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_sourcePeriodId_workspaceId_fkey" FOREIGN KEY ("sourcePeriodId", "workspaceId") REFERENCES "SubscriptionPeriod"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_recoveryId_workspaceId_fkey" FOREIGN KEY ("recoveryId", "workspaceId") REFERENCES "WorkspaceRecoveryRequest"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_sourcePeriodId_workspaceId_fkey" FOREIGN KEY ("sourcePeriodId", "workspaceId") REFERENCES "SubscriptionPeriod"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_activationPeriodId_workspaceId_fkey" FOREIGN KEY ("activationPeriodId", "workspaceId") REFERENCES "SubscriptionPeriod"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- No backfill, membership change, operational-data deletion or lifecycle rollout.
CREATE UNIQUE INDEX "WorkspaceExportRequest_one_open" ON "WorkspaceExportRequest" ("workspaceId") WHERE status IN ('REQUESTED','PROCESSING','READY');
CREATE UNIQUE INDEX "WorkspaceRecoveryRequest_one_pending" ON "WorkspaceRecoveryRequest" ("workspaceId","requesterId") WHERE status='PENDING';
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_valid" CHECK (
  "expiresAt">"createdAt" AND "schemaVersion"='workspace-export-v1' AND
  ((status='READY' AND artifact IS NOT NULL AND octet_length(artifact)<=8388636 AND "tokenHash" IS NOT NULL AND "artifactDigest" IS NOT NULL AND length("tokenHash")=64 AND length("artifactDigest")=64) OR
   (status<>'READY' AND artifact IS NULL AND "tokenHash" IS NULL)) AND
  (status<>'PROCESSING' OR "leaseUntil" IS NOT NULL)
);
ALTER TABLE "WorkspaceRecoveryRequest" ADD CONSTRAINT "WorkspaceRecoveryRequest_valid" CHECK (
  (("activationPeriodId" IS NULL AND "activatedAt" IS NULL) OR ("activationPeriodId" IS NOT NULL AND "activatedAt" IS NOT NULL AND "allowReactivation")) AND
  (status NOT IN ('APPROVED','REVOKED','EXPIRED') OR
    ("reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "identityCheckedAt" IS NOT NULL AND "ownershipVerifiedAt" IS NOT NULL AND
     "evidenceReferences" IS NOT NULL AND "reviewReason" IS NOT NULL AND ("allowExport" OR "allowReactivation") AND
     "expiresAt" IS NOT NULL AND "expiresAt">"reviewedAt" AND "expiresAt"<="reviewedAt"+interval '60 minutes')) AND
  (status<>'REVOKED' OR ("revokedAt" IS NOT NULL AND "revocationReason" IS NOT NULL))
);
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_data_reference" CHECK (
  (type::text LIKE 'EXPORT_%' AND "exportId" IS NOT NULL AND "recoveryId" IS NULL) OR
  ((type::text LIKE 'RECOVERY_%' OR type::text='WORKSPACE_RESTORED') AND "recoveryId" IS NOT NULL AND "exportId" IS NULL) OR
  (type::text IN ('WORKSPACE_ARCHIVED','WORKSPACE_CANCELED','WORKSPACE_REACTIVATED') AND "exportId" IS NULL AND "recoveryId" IS NULL)
);
CREATE FUNCTION coreops_data_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='WorkspaceRecoveryRequest' THEN
  IF ROW(NEW."workspaceId",NEW."requesterId",NEW."requesterExternalId",NEW."emailHash",NEW."sourcePeriodId",NEW."idempotencyKey",NEW."payloadHash",NEW."claimReference",NEW."createdAt") IS DISTINCT FROM ROW(OLD."workspaceId",OLD."requesterId",OLD."requesterExternalId",OLD."emailHash",OLD."sourcePeriodId",OLD."idempotencyKey",OLD."payloadHash",OLD."claimReference",OLD."createdAt") THEN RAISE EXCEPTION 'Recovery identity snapshot is immutable'; END IF;
  IF OLD."reviewedAt" IS NOT NULL AND ROW(NEW."reviewedAt",NEW."reviewedById",NEW."identityCheckedAt",NEW."ownershipVerifiedAt",NEW."evidenceReferences",NEW."reviewReason",NEW."expiresAt",NEW."allowExport",NEW."allowReactivation") IS DISTINCT FROM ROW(OLD."reviewedAt",OLD."reviewedById",OLD."identityCheckedAt",OLD."ownershipVerifiedAt",OLD."evidenceReferences",OLD."reviewReason",OLD."expiresAt",OLD."allowExport",OLD."allowReactivation") THEN RAISE EXCEPTION 'Recovery review is immutable'; END IF;
  IF OLD."activationPeriodId" IS NOT NULL AND ROW(NEW."activationPeriodId",NEW."activatedAt") IS DISTINCT FROM ROW(OLD."activationPeriodId",OLD."activatedAt") THEN RAISE EXCEPTION 'Recovery activation is immutable'; END IF;
 ELSE
  IF ROW(NEW."workspaceId",NEW."requesterId",NEW."sourcePeriodId",NEW."recoveryId",NEW."idempotencyKey",NEW."payloadHash",NEW."schemaVersion",NEW."expiresAt",NEW."createdAt") IS DISTINCT FROM ROW(OLD."workspaceId",OLD."requesterId",OLD."sourcePeriodId",OLD."recoveryId",OLD."idempotencyKey",OLD."payloadHash",OLD."schemaVersion",OLD."expiresAt",OLD."createdAt") THEN RAISE EXCEPTION 'Export authorization snapshot is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER recovery_request_immutable BEFORE UPDATE ON "WorkspaceRecoveryRequest" FOR EACH ROW EXECUTE FUNCTION coreops_data_request_immutable();
CREATE TRIGGER export_request_immutable BEFORE UPDATE ON "WorkspaceExportRequest" FOR EACH ROW EXECUTE FUNCTION coreops_data_request_immutable();
