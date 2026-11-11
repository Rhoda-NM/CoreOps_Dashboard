-- CreateEnum
CREATE TYPE "MarketAvailability" AS ENUM ('OPEN', 'REVIEW_REQUIRED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "MarketApplicationState" AS ENUM ('SUBMITTED', 'APPROVED', 'DEFERRED', 'REJECTED', 'REVOKED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MarketDecisionType" AS ENUM ('OPEN_POLICY', 'APPROVE', 'DEFER', 'REJECT', 'REVOKE', 'WITHDRAW');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "marketApplicationId" TEXT;

-- CreateTable
CREATE TABLE "MarketPolicy" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "defaultAvailability" "MarketAvailability" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "countries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketApplication" (
    "id" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "latestSubmissionId" TEXT,
    "operativeSubmissionId" TEXT,
    "currentDecisionId" TEXT,
    "state" "MarketApplicationState" NOT NULL DEFAULT 'SUBMITTED',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSubmission" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "policyId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "MarketSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketDecision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "MarketDecisionType" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reviewerAdminId" TEXT,
    "reason" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "MarketDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketPolicy_revision_key" ON "MarketPolicy"("revision");

-- CreateIndex
CREATE INDEX "MarketApplication_applicantUserId_createdAt_idx" ON "MarketApplication"("applicantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketApplication_state_createdAt_idx" ON "MarketApplication"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSubmission_applicationId_revision_key" ON "MarketSubmission"("applicationId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSubmission_applicantUserId_idempotencyKey_key" ON "MarketSubmission"("applicantUserId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSubmission_id_applicationId_key" ON "MarketSubmission"("id", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDecision_operationKey_key" ON "MarketDecision"("operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDecision_id_applicationId_key" ON "MarketDecision"("id", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_marketApplicationId_key" ON "Workspace"("marketApplicationId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_marketApplicationId_fkey" FOREIGN KEY ("marketApplicationId") REFERENCES "MarketApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketApplication" ADD CONSTRAINT "MarketApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSubmission" ADD CONSTRAINT "MarketSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MarketApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSubmission" ADD CONSTRAINT "MarketSubmission_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSubmission" ADD CONSTRAINT "MarketSubmission_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "MarketPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDecision" ADD CONSTRAINT "MarketDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MarketApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDecision" ADD CONSTRAINT "MarketDecision_submissionId_applicationId_fkey" FOREIGN KEY ("submissionId", "applicationId") REFERENCES "MarketSubmission"("id", "applicationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDecision" ADD CONSTRAINT "MarketDecision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDecision" ADD CONSTRAINT "MarketDecision_reviewerAdminId_fkey" FOREIGN KEY ("reviewerAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Configuration only; no customer classification/backfill.
INSERT INTO "MarketPolicy" (id,revision,"defaultAvailability",countries) VALUES ('KENYA-FIRST-v1',1,'REVIEW_REQUIRED','{"KE":"OPEN"}');
ALTER TABLE "MarketPolicy" ADD CHECK (revision>0 AND jsonb_typeof(countries)='object' AND octet_length(countries::text)<=16384);
ALTER TABLE "MarketSubmission" ADD CHECK (revision>0 AND country ~ '^[A-Z]{2}$' AND interest IN ('WORKFLOW','PROJECTS','INVOICING') AND length("useCase") BETWEEN 3 AND 1000 AND length("idempotencyKey") BETWEEN 16 AND 100 AND "payloadHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "MarketDecision" ADD CHECK (length(reason) BETWEEN 3 AND 1000 AND "payloadHash" ~ '^[a-f0-9]{64}$' AND (type='APPROVE')=("validUntil" IS NOT NULL) AND ("validUntil" IS NULL OR "validUntil">"effectiveAt") AND (type IN ('APPROVE','DEFER','REJECT','REVOKE'))=("reviewerAdminId" IS NOT NULL));
CREATE FUNCTION market_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Market history is immutable'; END $$;
CREATE TRIGGER market_policy_immutable BEFORE UPDATE ON "MarketPolicy" FOR EACH ROW EXECUTE FUNCTION market_immutable();
CREATE TRIGGER market_submission_immutable BEFORE UPDATE ON "MarketSubmission" FOR EACH ROW EXECUTE FUNCTION market_immutable();
CREATE TRIGGER market_decision_immutable BEFORE UPDATE ON "MarketDecision" FOR EACH ROW EXECUTE FUNCTION market_immutable();
CREATE FUNCTION market_policy_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM jsonb_each_text(NEW.countries) p WHERE p.key !~ '^[A-Z]{2}$' OR p.value NOT IN ('OPEN','REVIEW_REQUIRED','UNAVAILABLE')) THEN RAISE EXCEPTION 'Invalid market policy'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_policy_validate BEFORE INSERT ON "MarketPolicy" FOR EACH ROW EXECUTE FUNCTION market_policy_validate();
CREATE FUNCTION market_submission_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "MarketApplication" a WHERE a.id=NEW."applicationId" AND a."applicantUserId"=NEW."applicantUserId") THEN RAISE EXCEPTION 'Market subject mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_submission_validate BEFORE INSERT ON "MarketSubmission" FOR EACH ROW EXECUTE FUNCTION market_submission_validate();
CREATE FUNCTION market_decision_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a "MarketApplication"; s "MarketSubmission"; p "MarketPolicy";
BEGIN
 SELECT * INTO STRICT a FROM "MarketApplication" WHERE id=NEW."applicationId";
 SELECT * INTO STRICT s FROM "MarketSubmission" WHERE id=NEW."submissionId" AND "applicationId"=a.id;
 SELECT * INTO STRICT p FROM "MarketPolicy" WHERE id=s."policyId";
 IF NEW.type='OPEN_POLICY' THEN
  IF NEW."actorUserId"<>a."applicantUserId" OR COALESCE(p.countries->>s.country,p."defaultAvailability"::text)<>'OPEN' THEN RAISE EXCEPTION 'Invalid automatic market decision'; END IF;
 ELSIF NEW.type='WITHDRAW' THEN
  IF NEW."actorUserId"<>a."applicantUserId" THEN RAISE EXCEPTION 'Invalid applicant action'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM "PlatformAdmin" ad WHERE ad.id=NEW."reviewerAdminId" AND ad.active AND ad.role='SUPER_ADMIN' AND ad."userId"=NEW."actorUserId" AND ad."userId"<>a."applicantUserId") OR EXISTS(SELECT 1 FROM "Workspace" w JOIN "WorkspaceMember" m ON m."workspaceId"=w.id WHERE w."marketApplicationId"=a.id AND m."userId"=NEW."actorUserId") THEN RAISE EXCEPTION 'Invalid market reviewer'; END IF;
  IF NEW.type='APPROVE' AND COALESCE(p.countries->>s.country,p."defaultAvailability"::text)<>'REVIEW_REQUIRED' THEN RAISE EXCEPTION 'Market is not reviewable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_decision_validate BEFORE INSERT ON "MarketDecision" FOR EACH ROW EXECUTE FUNCTION market_decision_validate();
CREATE FUNCTION market_case_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."applicantUserId"<>OLD."applicantUserId" OR NEW."createdAt"<>OLD."createdAt" OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Invalid market revision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "MarketSubmission" s WHERE s.id=NEW."latestSubmissionId" AND s."applicationId"=NEW.id AND s."applicantUserId"=NEW."applicantUserId") THEN RAISE EXCEPTION 'Invalid submission pointer'; END IF;
 IF NEW."currentDecisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "MarketDecision" d WHERE d.id=NEW."currentDecisionId" AND d."applicationId"=NEW.id AND d."submissionId"=NEW."latestSubmissionId") THEN RAISE EXCEPTION 'Invalid decision pointer'; END IF;
 IF NEW.state='APPROVED' AND NOT EXISTS(SELECT 1 FROM "MarketDecision" d WHERE d.id=NEW."currentDecisionId" AND d."applicationId"=NEW.id AND d."submissionId"=NEW."operativeSubmissionId" AND d.type IN ('OPEN_POLICY','APPROVE')) THEN RAISE EXCEPTION 'Invalid approval pointer'; END IF;
 IF NEW.state<>'APPROVED' AND NEW."operativeSubmissionId" IS NOT NULL THEN RAISE EXCEPTION 'Invalid operative submission'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_case_validate BEFORE UPDATE ON "MarketApplication" FOR EACH ROW EXECUTE FUNCTION market_case_validate();
ALTER TABLE "MarketApplication" ADD CONSTRAINT market_latest_fk FOREIGN KEY ("latestSubmissionId",id) REFERENCES "MarketSubmission"(id,"applicationId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "MarketApplication" ADD CONSTRAINT market_operative_fk FOREIGN KEY ("operativeSubmissionId",id) REFERENCES "MarketSubmission"(id,"applicationId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "MarketApplication" ADD CONSTRAINT market_decision_fk FOREIGN KEY ("currentDecisionId",id) REFERENCES "MarketDecision"(id,"applicationId") DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION market_workspace_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW."marketApplicationId" IS DISTINCT FROM OLD."marketApplicationId" THEN RAISE EXCEPTION 'Market workspace binding requires separate transition review'; END IF;
 IF NEW."marketApplicationId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "MarketApplication" a JOIN "MarketDecision" d ON d.id=a."currentDecisionId" AND d."applicationId"=a.id WHERE a.id=NEW."marketApplicationId" AND a.state='APPROVED' AND a."latestSubmissionId"=a."operativeSubmissionId" AND d.type IN ('OPEN_POLICY','APPROVE') AND d."effectiveAt"<=clock_timestamp() AND (d.type='OPEN_POLICY' OR d."validUntil">clock_timestamp())) THEN
  IF TG_OP='INSERT' OR (NEW."activationStatus"='ACTIVE' AND OLD."activationStatus" IS DISTINCT FROM NEW."activationStatus") THEN RAISE EXCEPTION 'Market approval required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_workspace_validate BEFORE INSERT OR UPDATE ON "Workspace" FOR EACH ROW EXECUTE FUNCTION market_workspace_validate();
