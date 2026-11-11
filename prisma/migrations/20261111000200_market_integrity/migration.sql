-- Forward hardening after initial rehearsal. No applied migration edited.
ALTER TABLE "MarketSubmission" ADD COLUMN "declarationSource" TEXT NOT NULL DEFAULT 'SELF_DECLARED';
ALTER TABLE "MarketSubmission" ADD CHECK ("declarationSource"='SELF_DECLARED');
-- Unknown previous revision remains NULL rather than fabricated historical proof.
ALTER TABLE "MarketDecision" ADD COLUMN "applicationRevision" INTEGER;
ALTER TABLE "MarketDecision" ADD CHECK ("applicationRevision" IS NULL OR "applicationRevision">=0);
CREATE FUNCTION market_revision_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='MarketDecision' THEN
  IF NEW."applicationRevision" IS NULL OR NOT EXISTS(SELECT 1 FROM "MarketApplication" a WHERE a.id=NEW."applicationId" AND a.revision=NEW."applicationRevision") THEN RAISE EXCEPTION 'Stale market decision'; END IF;
 ELSE
  IF NEW."currentDecisionId" IS DISTINCT FROM OLD."currentDecisionId" AND NEW."currentDecisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "MarketDecision" d WHERE d.id=NEW."currentDecisionId" AND d."applicationId"=NEW.id AND d."applicationRevision"=OLD.revision) THEN RAISE EXCEPTION 'Stale market pointer'; END IF;
  IF NEW."latestSubmissionId" IS DISTINCT FROM OLD."latestSubmissionId" AND EXISTS(SELECT 1 FROM "Workspace" w WHERE w."marketApplicationId"=NEW.id) THEN RAISE EXCEPTION 'Bound business change needs separate review'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER market_revision_validate BEFORE INSERT ON "MarketDecision" FOR EACH ROW EXECUTE FUNCTION market_revision_validate();
CREATE TRIGGER market_pointer_validate BEFORE UPDATE ON "MarketApplication" FOR EACH ROW EXECUTE FUNCTION market_revision_validate();
