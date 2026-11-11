-- AlterTable
ALTER TABLE "NotificationOutbox" ADD COLUMN     "identityKeyVersion" TEXT,
ADD COLUMN     "replacementAuditId" TEXT,
ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NotificationProviderEvent" ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NotificationRun" ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NotificationControl" ADD COLUMN     "simulationEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NotificationProviderPermit" (
    "slot" INTEGER NOT NULL,
    "token" TEXT,
    "notificationId" TEXT,
    "leaseUntil" TIMESTAMP(3),

    CONSTRAINT "NotificationProviderPermit_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "NotificationSimulationInstance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSimulationInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationProviderPermit_token_key" ON "NotificationProviderPermit"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_replacementAuditId_key" ON "NotificationOutbox"("replacementAuditId");

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_replacementAuditId_fkey" FOREIGN KEY ("replacementAuditId") REFERENCES "PlatformAuditEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationProviderPermit" ADD CONSTRAINT "NotificationProviderPermit_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "NotificationOutbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- N-B capture is preserved; N-C evidence is strictly marked simulation.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='"NotificationOutbox"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%templateVersion%' LOOP EXECUTE format('ALTER TABLE "NotificationOutbox" DROP CONSTRAINT %I',r.conname); END LOOP;
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='"NotificationDeliveryAttempt"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%mode%' LOOP EXECUTE format('ALTER TABLE "NotificationDeliveryAttempt" DROP CONSTRAINT %I',r.conname); END LOOP;
END $$;
ALTER TABLE "NotificationOutbox" ADD CHECK (length("templateDigest")=64 AND ((NOT simulated AND "templateVersion"='CAPTURE-GENERIC-v1') OR (simulated AND "templateVersion"='SIMULATION-TRANSACTIONAL-v1')) AND ("safeRetryUntil" IS NULL OR ("recipientVerifiedAt" IS NOT NULL AND "safeRetryUntil">"recipientVerifiedAt" AND "safeRetryUntil"<=COALESCE("firstDispatchedAt","recipientVerifiedAt")+interval '23 hours')));
ALTER TABLE "NotificationDeliveryAttempt" ADD CHECK ((mode='CAPTURE' AND "dispatchedAt" IS NULL AND "providerMessageId" IS NULL AND result IN ('CAPTURE_INTENT','CAPTURED','CAPTURE_ABANDONED')) OR (mode IN ('PROVIDER','SIMULATED') AND "dispatchedAt" IS NOT NULL AND result NOT IN ('CAPTURE_INTENT','CAPTURED','CAPTURE_ABANDONED')));
ALTER TABLE "NotificationProviderPermit" ADD CHECK (slot IN (1,2) AND ((token IS NULL AND "notificationId" IS NULL AND "leaseUntil" IS NULL) OR (token IS NOT NULL AND "notificationId" IS NOT NULL AND "leaseUntil" IS NOT NULL)));
INSERT INTO "NotificationProviderPermit" (slot) VALUES (1),(2);
CREATE INDEX notification_suppression_versions ON "NotificationSuppression" ("providerScope","digestKeyVersion") WHERE active;
CREATE INDEX notification_sim_due ON "NotificationOutbox" (priority,"nextAttemptAt","scheduledAt",id) WHERE "processingState" IN ('PENDING','RETRY_PENDING','CLAIMED');

CREATE OR REPLACE FUNCTION notification_outbox_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN

 IF NEW.simulated THEN
  IF NEW."providerScope" NOT LIKE 'simulation:%' OR NEW."captureAttempts"<>0 OR NEW."captureId" IS NOT NULL THEN RAISE EXCEPTION 'Invalid simulation scope'; END IF;
  IF NEW.kind='EXPORT_AVAILABLE' AND NEW."dispatchedAttempts">0 THEN RAISE EXCEPTION 'Export-ready transport requires N-X'; END IF;
  IF NEW."payloadHash" IS NOT NULL AND (NEW."frozenPayloadCipher" IS NULL OR NEW."identityKeyVersion" IS NULL OR NEW."payloadKeyVersion" IS NULL OR NEW."destinationDigest" IS NULL OR NEW."identityBindingDigest" IS NULL OR NEW."recipientVerifiedAt" IS NULL OR NEW."firstDispatchedAt" IS NULL OR NEW."safeRetryUntil"<>NEW."firstDispatchedAt"+interval '23 hours') THEN RAISE EXCEPTION 'Incomplete frozen simulation'; END IF;
  IF NEW.generation=1 THEN
   IF NEW."replacesId" IS NOT NULL OR NEW."replacementAuditId" IS NOT NULL THEN RAISE EXCEPTION 'Invalid initial generation'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM "NotificationOutbox" o JOIN "PlatformAuditEvent" a ON a.id=NEW."replacementAuditId" WHERE o.id=NEW."replacesId" AND o."logicalKey"=NEW."logicalKey" AND o."sourceId"=NEW."sourceId" AND o."recipientUserId"=NEW."recipientUserId" AND o.kind=NEW.kind AND NEW.generation=o.generation+1 AND o."processingState" IN ('CANCELED','SUPPRESSED','MANUAL_REVIEW','SETTLED') AND o."deliveryOutcome" IN ('NOT_SENT','FAILED') AND o."providerMessageId" IS NULL AND a.action='NOTIFICATION_REPLACEMENT_REVIEWED' AND a."resourceId"=o.id AND a."workspaceId"=(SELECT "workspaceId" FROM "NotificationSource" WHERE id=o."sourceId")) THEN RAISE EXCEPTION 'Replacement requires safe reviewed linkage'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NOT OLD.simulated AND (OLD."payloadHash" IS NOT NULL OR OLD."captureAttempts">0 OR OLD."dispatchedAttempts">0 OR OLD."processingState" NOT IN ('PENDING','RETRY_PENDING','CLAIMED')) THEN RAISE EXCEPTION 'Attempted capture cannot become dispatch'; END IF;
   IF OLD.simulated AND (to_jsonb(OLD)-ARRAY['processingState','deliveryOutcome','leaseToken','leaseUntil','version','dispatchedAttempts','nextAttemptAt','firstDispatchedAt','safeRetryUntil','providerMessageId','frozenPayloadCipher','payloadKeyVersion','payloadHash','destinationDigest','identityBindingDigest','identityKeyVersion','recipientVerifiedAt','acceptedAt','deliveredAt','bouncedAt','complainedAt','lastFailureCode','completedAt']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['processingState','deliveryOutcome','leaseToken','leaseUntil','version','dispatchedAttempts','nextAttemptAt','firstDispatchedAt','safeRetryUntil','providerMessageId','frozenPayloadCipher','payloadKeyVersion','payloadHash','destinationDigest','identityBindingDigest','identityKeyVersion','recipientVerifiedAt','acceptedAt','deliveredAt','bouncedAt','complainedAt','lastFailureCode','completedAt']) THEN RAISE EXCEPTION 'Immutable simulation identity'; END IF;
   IF OLD."payloadHash" IS NOT NULL AND ROW(OLD."payloadHash",OLD."frozenPayloadCipher",OLD."payloadKeyVersion",OLD."identityBindingDigest",OLD."destinationDigest",OLD."identityKeyVersion",OLD."recipientVerifiedAt",OLD."firstDispatchedAt",OLD."safeRetryUntil") IS DISTINCT FROM ROW(NEW."payloadHash",NEW."frozenPayloadCipher",NEW."payloadKeyVersion",NEW."identityBindingDigest",NEW."destinationDigest",NEW."identityKeyVersion",NEW."recipientVerifiedAt",NEW."firstDispatchedAt",NEW."safeRetryUntil") THEN RAISE EXCEPTION 'Immutable frozen simulation'; END IF;
   IF OLD."providerMessageId" IS NOT NULL AND OLD."providerMessageId" IS DISTINCT FROM NEW."providerMessageId" THEN RAISE EXCEPTION 'Immutable provider message'; END IF;
   IF (OLD."acceptedAt" IS NOT NULL AND OLD."acceptedAt" IS DISTINCT FROM NEW."acceptedAt") OR (OLD."deliveredAt" IS NOT NULL AND OLD."deliveredAt" IS DISTINCT FROM NEW."deliveredAt") OR (OLD."bouncedAt" IS NOT NULL AND OLD."bouncedAt" IS DISTINCT FROM NEW."bouncedAt") OR (OLD."complainedAt" IS NOT NULL AND OLD."complainedAt" IS DISTINCT FROM NEW."complainedAt") THEN RAISE EXCEPTION 'Immutable delivery facts'; END IF;
  END IF;
  IF NEW."noticeId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "LifecycleNotice" n WHERE n.id=NEW."noticeId" AND n."sourceId"=NEW."sourceId") THEN RAISE EXCEPTION 'Notice source mismatch'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.simulated THEN RAISE EXCEPTION 'Simulation cannot become capture'; END IF;
 IF NEW."noticeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "LifecycleNotice" n WHERE n.id=NEW."noticeId" AND n."sourceId"=NEW."sourceId") THEN RAISE EXCEPTION 'Notice source mismatch'; END IF;
 IF NEW.generation <> 1 OR NEW."replacesId" IS NOT NULL THEN RAISE EXCEPTION 'Replacement review unavailable in N-B'; END IF;
 IF NEW."providerScope" NOT LIKE 'capture:%' OR NEW."providerMessageId" IS NOT NULL OR NEW."deliveryOutcome" <> 'NOT_SENT' OR NEW."dispatchedAttempts" <> 0 OR NEW."firstDispatchedAt" IS NOT NULL OR NEW."acceptedAt" IS NOT NULL OR NEW."deliveredAt" IS NOT NULL OR NEW."bouncedAt" IS NOT NULL OR NEW."complainedAt" IS NOT NULL OR NEW."frozenPayloadCipher" IS NOT NULL THEN RAISE EXCEPTION 'External delivery unavailable in N-B'; END IF;
 IF NEW."payloadHash" IS NOT NULL AND (NEW."destinationDigest" IS NULL OR NEW."identityBindingDigest" IS NULL OR NEW."recipientVerifiedAt" IS NULL) THEN RAISE EXCEPTION 'Missing verified capture binding'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD) - ARRAY['processingState','leaseToken','leaseUntil','version','captureAttempts','nextAttemptAt','payloadHash','destinationDigest','identityBindingDigest','recipientVerifiedAt','safeRetryUntil','captureId','lastFailureCode','completedAt']) IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['processingState','leaseToken','leaseUntil','version','captureAttempts','nextAttemptAt','payloadHash','destinationDigest','identityBindingDigest','recipientVerifiedAt','safeRetryUntil','captureId','lastFailureCode','completedAt']) THEN RAISE EXCEPTION 'Immutable notification identity'; END IF;
  IF OLD."payloadHash" IS NOT NULL AND ROW(OLD."payloadHash",OLD."destinationDigest",OLD."identityBindingDigest",OLD."recipientVerifiedAt",OLD."safeRetryUntil") IS DISTINCT FROM ROW(NEW."payloadHash",NEW."destinationDigest",NEW."identityBindingDigest",NEW."recipientVerifiedAt",NEW."safeRetryUntil") THEN RAISE EXCEPTION 'Immutable frozen capture'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION notification_simulated_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.simulated AND NEW."providerScope" NOT LIKE 'simulation:%' THEN RAISE EXCEPTION 'Invalid simulated evidence scope'; END IF;
 IF NEW."notificationId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o.simulated=NEW.simulated) THEN RAISE EXCEPTION 'Evidence simulation mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_sim_evidence BEFORE INSERT OR UPDATE ON "NotificationProviderEvent" FOR EACH ROW EXECUTE FUNCTION notification_simulated_evidence();

CREATE OR REPLACE FUNCTION notification_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='NotificationDeliveryAttempt' THEN
  IF NEW."providerMessageId" IS DISTINCT FROM OLD."providerMessageId" AND (OLD."providerMessageId" IS NOT NULL OR NEW.result<>'ACCEPTED' OR NEW.mode NOT IN ('SIMULATED','PROVIDER')) THEN RAISE EXCEPTION 'Invalid acceptance evidence'; END IF;
  IF (to_jsonb(OLD)-ARRAY['completedAt','result','captureId','responseCategory','retryEligible','providerMessageId']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['completedAt','result','captureId','responseCategory','retryEligible','providerMessageId']) OR OLD."completedAt" IS NOT NULL THEN RAISE EXCEPTION 'Immutable attempt evidence'; END IF;
 ELSE
  IF (to_jsonb(OLD)-ARRAY['state','failureCode','processedAt','notificationId','attemptId']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['state','failureCode','processedAt','notificationId','attemptId']) THEN RAISE EXCEPTION 'Immutable provider evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
