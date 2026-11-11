-- PREPARED ONLY. Do not apply without target/backup/pending-chain review.
-- No environment, actor, Workspace, funding or historical evidence is seeded.
CREATE TABLE "Pay1PreviewAdmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "deploymentId" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "databaseHost" TEXT NOT NULL,
  "databaseName" TEXT NOT NULL,
  "clerkHost" TEXT NOT NULL,
  "actorExternalIds" TEXT[] NOT NULL,
  "approvalReference" TEXT NOT NULL,
  "syntheticOnly" BOOLEAN NOT NULL DEFAULT true,
  "notBefore" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pay1_admission_bounds" CHECK (
    "syntheticOnly" AND "expiresAt">"notBefore"
    AND length("id") BETWEEN 8 AND 100
    AND "projectId" ~ '^prj_[a-zA-Z0-9]+$'
    AND "deploymentId" ~ '^dpl_[a-zA-Z0-9]+$'
    AND "origin" ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$'
    AND "databaseHost" ~ '^[-a-zA-Z0-9.]+:[0-9]{1,5}$'
    AND "databaseHost" !~ '^(localhost|127\.0\.0\.1):' 
    AND length("databaseHost") BETWEEN 1 AND 253
    AND length("databaseName") BETWEEN 1 AND 63
    AND "clerkHost" ~ '^[a-z0-9-]+\.clerk\.accounts\.dev$'
    AND cardinality("actorExternalIds") BETWEEN 1 AND 20
    AND length("approvalReference") BETWEEN 10 AND 300
    AND ("revokedAt" IS NULL OR "revokedAt">="createdAt")
  )
);
ALTER TABLE "MarketApplication" ADD COLUMN "pay1AdmissionId" TEXT;
CREATE INDEX "MarketApplication_pay1AdmissionId_createdAt_idx" ON "MarketApplication"("pay1AdmissionId", "createdAt");
ALTER TABLE "MarketApplication" ADD CONSTRAINT "MarketApplication_pay1AdmissionId_fkey"
  FOREIGN KEY ("pay1AdmissionId") REFERENCES "Pay1PreviewAdmission"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION pay1_admission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW."actorExternalIds") actor WHERE actor IS NULL OR actor !~ '^user_[a-zA-Z0-9]+$')
     OR cardinality(NEW."actorExternalIds")<>(SELECT count(DISTINCT actor) FROM unnest(NEW."actorExternalIds") actor)
    THEN RAISE EXCEPTION 'Invalid PAY-1 actors'; END IF;
  IF TG_OP='UPDATE' AND (
    (to_jsonb(NEW)-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'revokedAt')
    OR OLD."revokedAt" IS NOT NULL OR NEW."revokedAt" IS NULL
  ) THEN RAISE EXCEPTION 'PAY-1 admission is immutable except one-way revocation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pay1_admission_guard BEFORE INSERT OR UPDATE ON "Pay1PreviewAdmission"
  FOR EACH ROW EXECUTE FUNCTION pay1_admission_guard();

CREATE FUNCTION pay1_case_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW."pay1AdmissionId" IS DISTINCT FROM OLD."pay1AdmissionId" THEN
      RAISE EXCEPTION 'PAY-1 case cannot be classified or rebound';
    END IF;
  ELSIF NEW."pay1AdmissionId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "Pay1PreviewAdmission" a JOIN "User" u ON u.id=NEW."applicantUserId"
      WHERE a.id=NEW."pay1AdmissionId" AND a."syntheticOnly" AND a."revokedAt" IS NULL
        AND a."notBefore"<=clock_timestamp() AND a."expiresAt">clock_timestamp()
        AND NEW."createdAt">=a."notBefore" AND NEW."createdAt"<a."expiresAt"
        AND u."externalId"=ANY(a."actorExternalIds")
    ) THEN RAISE EXCEPTION 'PAY-1 admission required'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pay1_case_guard BEFORE INSERT OR UPDATE ON "MarketApplication"
  FOR EACH ROW EXECUTE FUNCTION pay1_case_guard();

CREATE FUNCTION pay1_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "MarketApplication" a WHERE a.id=NEW."applicationId" AND a."pay1AdmissionId" IS NOT NULL) THEN
    IF NEW.type='APPROVE' OR (NEW.type='OPEN_POLICY' AND NOT EXISTS (
      SELECT 1 FROM "MarketSubmission" s WHERE s.id=NEW."submissionId" AND s.country='KE'
    )) THEN RAISE EXCEPTION 'PAY-1 does not admit manual or international approval'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pay1_decision_guard BEFORE INSERT ON "MarketDecision"
  FOR EACH ROW EXECUTE FUNCTION pay1_decision_guard();
