BEGIN;
CREATE TABLE "StagingEnvironment" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "origin" TEXT NOT NULL,
 "databaseHost" TEXT NOT NULL, "databaseName" TEXT NOT NULL, "clerkHost" TEXT NOT NULL,
 "syntheticOnly" BOOLEAN NOT NULL DEFAULT true, "active" BOOLEAN NOT NULL DEFAULT true,
 "approvalReference" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StagingEnvironment_synthetic" CHECK ("syntheticOnly" AND length("approvalReference")>=10)
);
CREATE TABLE "StagingAcknowledgment" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "stagingEnvironmentId" TEXT NOT NULL,
 "content" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
 "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StagingAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "StagingAcknowledgment_stagingEnvironmentId_fkey" FOREIGN KEY ("stagingEnvironmentId") REFERENCES "StagingEnvironment"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "StagingAcknowledgment_digest" CHECK ("contentHash"=encode(sha256(convert_to(content,'UTF8')),'hex') AND content LIKE 'SYNTHETIC STAGING TEST AGREEMENT%')
);
CREATE UNIQUE INDEX "StagingAcknowledgment_userId_stagingEnvironmentId_contentHash_key" ON "StagingAcknowledgment"("userId","stagingEnvironmentId","contentHash");
ALTER TABLE "SubscriptionPlanOffer" ADD COLUMN "pricingRelease" TEXT;
ALTER TABLE "SubscriptionPlanOffer" ADD COLUMN "commercialPath" TEXT NOT NULL DEFAULT 'MANUAL', ADD COLUMN "stagingEnvironmentId" TEXT;
ALTER TABLE "SubscriptionRequest" ADD COLUMN "commercialPath" TEXT NOT NULL DEFAULT 'MANUAL', ADD COLUMN "stagingEnvironmentId" TEXT;
ALTER TABLE "SubscriptionPlanOffer" ADD CONSTRAINT "SubscriptionPlanOffer_stagingEnvironmentId_fkey" FOREIGN KEY ("stagingEnvironmentId") REFERENCES "StagingEnvironment"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_stagingEnvironmentId_fkey" FOREIGN KEY ("stagingEnvironmentId") REFERENCES "StagingEnvironment"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlanOffer" ADD CONSTRAINT "SubscriptionPlanOffer_path" CHECK ("commercialPath" IN ('MANUAL','STANDARD') AND ("commercialPath"<>'STANDARD' OR ("stagingEnvironmentId" IS NOT NULL AND plan<>'ENTERPRISE' AND amount IS NOT NULL AND "memberLimit" IS NOT NULL)));
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_path" CHECK ("commercialPath" IN ('MANUAL','STANDARD') AND ("commercialPath"<>'STANDARD' OR ("stagingEnvironmentId" IS NOT NULL AND type<>'UPGRADE')));
ALTER TABLE "TaxConfiguration" ADD COLUMN synthetic BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPeriod" ALTER COLUMN "activatedById" DROP NOT NULL;
ALTER TABLE "SubscriptionPeriod" ADD COLUMN "activationSource" TEXT NOT NULL DEFAULT 'ADMIN', ADD COLUMN "verifiedReceiptId" TEXT;
CREATE UNIQUE INDEX "SubscriptionPeriod_verifiedReceiptId_key" ON "SubscriptionPeriod"("verifiedReceiptId");
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_verifiedReceiptId_fkey" FOREIGN KEY ("verifiedReceiptId") REFERENCES "SubscriptionPaymentReceipt"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_source" CHECK (("activationSource"='ADMIN' AND "activatedById" IS NOT NULL AND "verifiedReceiptId" IS NULL) OR ("activationSource"='PAYSTACK_TEST' AND "activatedById" IS NULL AND "verifiedReceiptId" IS NOT NULL));
ALTER TABLE "SubscriptionRequest" DROP CONSTRAINT "SubscriptionRequest_amounts";
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_amounts" CHECK (("quotedAmount" IS NULL OR "quotedAmount">0) AND ("taxAmount" IS NULL OR "taxAmount">=0) AND ("payableAmount" IS NULL OR ("payableAmount">0 AND "payableAmount"=coalesce("netAmount","quotedAmount")+"taxAmount")) AND ("approvedAt" IS NULL OR (("reviewedById" IS NOT NULL OR "commercialPath"='STANDARD') AND "receivingAccountId" IS NOT NULL AND "memberLimit">0 AND "payableAmount" IS NOT NULL AND "taxTreatment"<>'UNCONFIRMED')) AND ("vatRate" IS NULL OR "vatRate" BETWEEN 0 AND 99.9999));
CREATE FUNCTION coreops_staging_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r "SubscriptionRequest"; receipt "SubscriptionPaymentReceipt";
BEGIN
 IF TG_TABLE_NAME='StagingEnvironment' THEN
  IF (to_jsonb(NEW)-'active') IS DISTINCT FROM (to_jsonb(OLD)-'active') OR (NOT OLD.active AND NEW.active) THEN RAISE EXCEPTION 'Staging identity immutable; no implicit readmission'; END IF;
 ELSIF TG_TABLE_NAME='StagingAcknowledgment' THEN RAISE EXCEPTION 'Staging acknowledgment immutable';
 ELSIF TG_TABLE_NAME='SubscriptionRequest' THEN
  IF TG_OP='UPDATE' AND ROW(NEW."commercialPath",NEW."stagingEnvironmentId") IS DISTINCT FROM ROW(OLD."commercialPath",OLD."stagingEnvironmentId") THEN RAISE EXCEPTION 'Commercial path immutable'; END IF;
  IF NEW."commercialPath"='STANDARD' AND NOT EXISTS(SELECT 1 FROM "SubscriptionPlanOffer" o WHERE o.id=NEW."offerId" AND o."commercialPath"='STANDARD' AND o."stagingEnvironmentId"=NEW."stagingEnvironmentId" AND o."businessApprovedAt" IS NOT NULL AND o.amount=NEW."catalogAmount" AND o.amount=NEW."quotedAmount" AND o.plan=NEW.plan AND o.interval=NEW.interval AND o.version=NEW."offerVersion" AND o.features=NEW.features AND o."memberLimit"=NEW."memberLimit") THEN RAISE EXCEPTION 'Standard offer snapshot mismatch'; END IF;
 ELSIF TG_TABLE_NAME='SubscriptionPeriod' AND NEW."activationSource"='PAYSTACK_TEST' THEN
  SELECT * INTO STRICT r FROM "SubscriptionRequest" WHERE id=NEW."sourceRequestId";
  SELECT * INTO STRICT receipt FROM "SubscriptionPaymentReceipt" WHERE id=NEW."verifiedReceiptId";
  IF r."commercialPath"<>'STANDARD' OR r."stagingEnvironmentId" IS NULL OR r."quoteAcceptedAt" IS NULL OR receipt."requestId"<>r.id OR receipt."workspaceId"<>NEW."workspaceId" OR receipt.amount<>r."payableAmount" OR NEW."agreedAmount"<>receipt.amount OR receipt."confirmationSource"<>'PAYSTACK' OR NOT EXISTS(SELECT 1 FROM "PaystackAttempt" a WHERE a.id=receipt."providerAttemptId" AND a.mode='test' AND a.status='CONFIRMED') OR EXISTS(SELECT 1 FROM "SubscriptionPaymentReversal" WHERE "receiptId"=receipt.id) THEN RAISE EXCEPTION 'Verified standard Test Mode receipt required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_staging_identity BEFORE UPDATE ON "StagingEnvironment" FOR EACH ROW EXECUTE FUNCTION coreops_staging_integrity();
CREATE TRIGGER immutable_staging_ack BEFORE UPDATE ON "StagingAcknowledgment" FOR EACH ROW EXECUTE FUNCTION coreops_staging_integrity();
CREATE TRIGGER staging_request_integrity BEFORE INSERT OR UPDATE ON "SubscriptionRequest" FOR EACH ROW EXECUTE FUNCTION coreops_staging_integrity();
CREATE TRIGGER staging_period_integrity BEFORE INSERT ON "SubscriptionPeriod" FOR EACH ROW EXECUTE FUNCTION coreops_staging_integrity();
COMMIT;
