-- CreateEnum
CREATE TYPE "WorkspaceLifecycleEventType" AS ENUM ('WORKSPACE_ARCHIVED', 'WORKSPACE_CANCELED', 'WORKSPACE_REACTIVATED');

-- CreateTable
CREATE TABLE "WorkspaceLifecycle" (
    "workspaceId" TEXT NOT NULL,
    "sourcePeriodId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "cancellationEffectiveAt" TIMESTAMP(3),
    "cancellationRecordedAt" TIMESTAMP(3),
    "retentionEndsAt" TIMESTAMP(3),
    "nextEvaluationAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceLifecycle_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "WorkspaceLifecycleEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "type" "WorkspaceLifecycleEventType" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyVersion" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,

    CONSTRAINT "WorkspaceLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleJobRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "processed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "cursor" TEXT,

    CONSTRAINT "LifecycleJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLifecycle_sourcePeriodId_key" ON "WorkspaceLifecycle"("sourcePeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLifecycle_episodeId_key" ON "WorkspaceLifecycle"("episodeId");

-- CreateIndex
CREATE INDEX "WorkspaceLifecycle_nextEvaluationAt_idx" ON "WorkspaceLifecycle"("nextEvaluationAt");

-- CreateIndex
CREATE INDEX "WorkspaceLifecycle_retentionEndsAt_idx" ON "WorkspaceLifecycle"("retentionEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLifecycle_sourcePeriodId_workspaceId_key" ON "WorkspaceLifecycle"("sourcePeriodId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLifecycleEvent_operationKey_key" ON "WorkspaceLifecycleEvent"("operationKey");

-- CreateIndex
CREATE INDEX "WorkspaceLifecycleEvent_workspaceId_recordedAt_idx" ON "WorkspaceLifecycleEvent"("workspaceId", "recordedAt");

-- CreateIndex
CREATE INDEX "WorkspaceLifecycleEvent_recordedAt_id_idx" ON "WorkspaceLifecycleEvent"("recordedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPeriod_id_workspaceId_key" ON "SubscriptionPeriod"("id", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycle" ADD CONSTRAINT "WorkspaceLifecycle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycle" ADD CONSTRAINT "WorkspaceLifecycle_sourcePeriodId_workspaceId_fkey" FOREIGN KEY ("sourcePeriodId", "workspaceId") REFERENCES "SubscriptionPeriod"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_episodeId_workspaceId_fkey" FOREIGN KEY ("episodeId", "workspaceId") REFERENCES "SubscriptionPeriod"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additive only: no customer rows are backfilled or transitioned by migration.
ALTER TABLE "WorkspaceLifecycle" ADD CONSTRAINT "WorkspaceLifecycle_valid" CHECK (
  "revision" > 0 AND "episodeId" = "sourcePeriodId" AND
  (("cancellationEffectiveAt" IS NULL AND "cancellationRecordedAt" IS NULL AND "retentionEndsAt" IS NULL) OR
   ("cancellationEffectiveAt" IS NOT NULL AND "cancellationRecordedAt" IS NOT NULL AND "retentionEndsAt" IS NOT NULL AND
    "archivedAt" IS NOT NULL AND "cancellationEffectiveAt" > "archivedAt" AND
    "cancellationRecordedAt" >= "cancellationEffectiveAt" AND
    "retentionEndsAt" = "cancellationEffectiveAt" + interval '90 days'))
);
ALTER TABLE "WorkspaceLifecycleEvent" ADD CONSTRAINT "WorkspaceLifecycleEvent_valid" CHECK (
  "effectiveAt" <= "recordedAt" AND length("operationKey") > 0 AND length("policyVersion") > 0
);
ALTER TABLE "LifecycleJobRun" ADD CONSTRAINT "LifecycleJobRun_valid" CHECK (
  processed >= 0 AND skipped >= 0 AND failed >= 0 AND ("completedAt" IS NULL OR "completedAt" >= "startedAt")
);
CREATE INDEX "SubscriptionPeriod_lifecycle_coverage_idx" ON "SubscriptionPeriod" ("workspaceId", "endsAt" DESC) WHERE "revokedAt" IS NULL;

CREATE FUNCTION coreops_lifecycle_deadlines() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expiry timestamp(3);
BEGIN
  SELECT "endsAt" INTO expiry FROM "SubscriptionPeriod" WHERE id = NEW."sourcePeriodId" AND "workspaceId" = NEW."workspaceId";
  IF NEW."policyVersion" <> 'EXPIRY-60-RETENTION-90-v1' OR
     (NEW."archivedAt" IS NOT NULL AND NEW."archivedAt" <> expiry + interval '7 days') OR
     (NEW."cancellationEffectiveAt" IS NOT NULL AND NEW."cancellationEffectiveAt" <> expiry + interval '60 days') THEN
    RAISE EXCEPTION 'Invalid automatic lifecycle deadline';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lifecycle_deadlines BEFORE INSERT OR UPDATE ON "WorkspaceLifecycle" FOR EACH ROW EXECUTE FUNCTION coreops_lifecycle_deadlines();

CREATE FUNCTION coreops_lifecycle_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Lifecycle events are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lifecycle_event_immutable BEFORE UPDATE ON "WorkspaceLifecycleEvent" FOR EACH ROW EXECUTE FUNCTION coreops_lifecycle_event_immutable();

