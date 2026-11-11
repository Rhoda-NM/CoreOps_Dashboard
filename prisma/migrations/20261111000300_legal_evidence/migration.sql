-- CreateEnum
CREATE TYPE "LegalDocumentKind" AS ENUM ('TERMS', 'PRIVACY', 'CUSTOMER_DPA', 'COOKIE_NOTICE', 'RETENTION_SCHEDULE');

-- CreateEnum
CREATE TYPE "LegalReviewAction" AS ENUM ('SIMULATED_APPROVE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "LegalEvidenceEventType" AS ENUM ('PUBLISHED', 'SUPERSEDED', 'WITHDRAWN', 'TERMS_AGREED_PRIVACY_ACKNOWLEDGED', 'SUBJECT_DETACHED');

-- DropForeignKey
ALTER TABLE "LegalAcceptance" DROP CONSTRAINT "LegalAcceptance_userId_fkey";

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "kind" "LegalDocumentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'TEXT_UTF8',
    "rendererVersion" TEXT NOT NULL DEFAULT 'PLAIN_UTF8-v1',
    "content" BYTEA NOT NULL,
    "contentHash" TEXT NOT NULL,
    "hashAlgorithm" TEXT NOT NULL DEFAULT 'SHA-256',
    "byteLength" INTEGER NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalVersionReview" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "action" "LegalReviewAction" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalVersionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPublication" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "termsId" TEXT NOT NULL,
    "privacyId" TEXT NOT NULL,
    "termsReviewId" TEXT NOT NULL,
    "privacyReviewId" TEXT NOT NULL,
    "manifest" BYTEA NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "publisherId" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LegalPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPublicationControl" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LegalPublicationControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEvidenceSubject" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detachedAt" TIMESTAMP(3),
    "retentionReviewReference" TEXT,

    CONSTRAINT "LegalEvidenceSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPresentation" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "controlRevision" INTEGER NOT NULL,
    "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPresentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptanceEvidence" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "termsAgreement" BOOLEAN NOT NULL,
    "privacyAcknowledgment" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'REHEARSAL_AUTHENTICATED_EXPLICIT',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LegalAcceptanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEvidenceEvent" (
    "id" TEXT NOT NULL,
    "type" "LegalEvidenceEventType" NOT NULL,
    "publicationId" TEXT,
    "subjectId" TEXT,
    "receiptId" TEXT,
    "actorAdminId" TEXT,
    "operationKey" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LegalEvidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_kind_version_language_key" ON "LegalDocumentVersion"("kind", "version", "language");

-- CreateIndex
CREATE UNIQUE INDEX "LegalVersionReview_versionId_action_key" ON "LegalVersionReview"("versionId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPublication_version_key" ON "LegalPublication"("version");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEvidenceSubject_userId_key" ON "LegalEvidenceSubject"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPresentation_id_publicationId_subjectId_key" ON "LegalPresentation"("id", "publicationId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAcceptanceEvidence_subjectId_publicationId_key" ON "LegalAcceptanceEvidence"("subjectId", "publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEvidenceEvent_operationKey_key" ON "LegalEvidenceEvent"("operationKey");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalVersionReview" ADD CONSTRAINT "LegalVersionReview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalVersionReview" ADD CONSTRAINT "LegalVersionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublication" ADD CONSTRAINT "LegalPublication_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublication" ADD CONSTRAINT "LegalPublication_privacyId_fkey" FOREIGN KEY ("privacyId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublication" ADD CONSTRAINT "LegalPublication_termsReviewId_fkey" FOREIGN KEY ("termsReviewId") REFERENCES "LegalVersionReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublication" ADD CONSTRAINT "LegalPublication_privacyReviewId_fkey" FOREIGN KEY ("privacyReviewId") REFERENCES "LegalVersionReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublication" ADD CONSTRAINT "LegalPublication_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPublicationControl" ADD CONSTRAINT "LegalPublicationControl_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "LegalPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidenceSubject" ADD CONSTRAINT "LegalEvidenceSubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPresentation" ADD CONSTRAINT "LegalPresentation_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "LegalPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPresentation" ADD CONSTRAINT "LegalPresentation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LegalEvidenceSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptanceEvidence" ADD CONSTRAINT "LegalAcceptanceEvidence_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LegalEvidenceSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptanceEvidence" ADD CONSTRAINT "LegalAcceptanceEvidence_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "LegalPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptanceEvidence" ADD CONSTRAINT "LegalAcceptanceEvidence_presentationId_publicationId_subje_fkey" FOREIGN KEY ("presentationId", "publicationId", "subjectId") REFERENCES "LegalPresentation"("id", "publicationId", "subjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidenceEvent" ADD CONSTRAINT "LegalEvidenceEvent_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "LegalPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidenceEvent" ADD CONSTRAINT "LegalEvidenceEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LegalEvidenceSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidenceEvent" ADD CONSTRAINT "LegalEvidenceEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "LegalAcceptanceEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidenceEvent" ADD CONSTRAINT "LegalEvidenceEvent_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- No legal documents/approvals/receipts are seeded or backfilled.
INSERT INTO "LegalPublicationControl" (id,revision) VALUES ('REHEARSAL',0);
ALTER TABLE "LegalDocumentVersion" ADD CHECK (synthetic AND format='TEXT_UTF8' AND "rendererVersion"='PLAIN_UTF8-v1' AND "hashAlgorithm"='SHA-256' AND "byteLength"=octet_length(content) AND "byteLength" BETWEEN 1 AND 262144 AND "contentHash"=encode(sha256(content),'hex') AND convert_from(content,'UTF8') LIKE 'SYNTHETIC TEST%' AND position(chr(13) in convert_from(content,'UTF8'))=0 AND version ~ '^[A-Z0-9-]{3,80}$' AND length(language) BETWEEN 2 AND 35);
ALTER TABLE "LegalPublication" ADD CHECK (synthetic AND octet_length(manifest)<=8192 AND "manifestHash"=encode(sha256(manifest),'hex') AND "effectiveAt">="publishedAt");
ALTER TABLE "LegalVersionReview" ADD CHECK ("evidenceReference" LIKE 'SYNTHETIC:%' AND length("evidenceReference") BETWEEN 12 AND 300 AND length(reason) BETWEEN 10 AND 1000);
ALTER TABLE "LegalPresentation" ADD CHECK ("controlRevision">0 AND "expiresAt">"presentedAt" AND "expiresAt"<="presentedAt"+interval '5 minutes');
ALTER TABLE "LegalAcceptanceEvidence" ADD CHECK (synthetic AND "termsAgreement" AND "privacyAcknowledgment" AND source='REHEARSAL_AUTHENTICATED_EXPLICIT');
ALTER TABLE "LegalEvidenceEvent" ADD CHECK (synthetic AND length("operationKey") BETWEEN 1 AND 200);
ALTER TABLE "LegalPublicationControl" ADD CHECK (id='REHEARSAL' AND revision>=0);
CREATE FUNCTION legal_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Legal evidence update rejected'; END $$;
CREATE TRIGGER legal_legacy_immutable BEFORE UPDATE ON "LegalAcceptance" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_version_immutable BEFORE UPDATE ON "LegalDocumentVersion" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_review_immutable BEFORE UPDATE ON "LegalVersionReview" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_publication_immutable BEFORE UPDATE ON "LegalPublication" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_presentation_immutable BEFORE UPDATE ON "LegalPresentation" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_receipt_immutable BEFORE UPDATE ON "LegalAcceptanceEvidence" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE TRIGGER legal_event_immutable BEFORE UPDATE ON "LegalEvidenceEvent" FOR EACH ROW EXECUTE FUNCTION legal_immutable();
CREATE FUNCTION legal_admin_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text;
BEGIN
 IF TG_TABLE_NAME='LegalDocumentVersion' THEN actor:=NEW."createdById";
 ELSIF TG_TABLE_NAME='LegalVersionReview' THEN actor:=NEW."reviewerId";
 ELSE actor:=NEW."publisherId"; END IF;
 IF NOT EXISTS(SELECT 1 FROM "PlatformAdmin" a WHERE a.id=actor AND a.active AND a.role='SUPER_ADMIN') THEN RAISE EXCEPTION 'Legal administrator required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_version_admin BEFORE INSERT ON "LegalDocumentVersion" FOR EACH ROW EXECUTE FUNCTION legal_admin_validate();
CREATE TRIGGER legal_review_admin BEFORE INSERT ON "LegalVersionReview" FOR EACH ROW EXECUTE FUNCTION legal_admin_validate();
CREATE TRIGGER legal_publication_admin BEFORE INSERT ON "LegalPublication" FOR EACH ROW EXECUTE FUNCTION legal_admin_validate();
CREATE FUNCTION legal_publication_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t "LegalDocumentVersion"; p "LegalDocumentVersion"; m jsonb;
BEGIN
 SELECT * INTO STRICT t FROM "LegalDocumentVersion" WHERE id=NEW."termsId";
 SELECT * INTO STRICT p FROM "LegalDocumentVersion" WHERE id=NEW."privacyId";
 IF t.kind<>'TERMS' OR p.kind<>'PRIVACY' OR t.language<>p.language OR NOT EXISTS(SELECT 1 FROM "LegalVersionReview" r WHERE r.id=NEW."termsReviewId" AND r."versionId"=t.id AND r.action='SIMULATED_APPROVE') OR NOT EXISTS(SELECT 1 FROM "LegalVersionReview" r WHERE r.id=NEW."privacyReviewId" AND r."versionId"=p.id AND r.action='SIMULATED_APPROVE') OR EXISTS(SELECT 1 FROM "LegalVersionReview" r WHERE r."versionId" IN(t.id,p.id) AND r.action='WITHDRAW') THEN RAISE EXCEPTION 'Invalid legal version set'; END IF;
 m:=convert_from(NEW.manifest,'UTF8')::jsonb;
 IF m->>'id' IS DISTINCT FROM NEW.id OR m->>'version' IS DISTINCT FROM NEW.version OR m->'terms'->>'id' IS DISTINCT FROM t.id OR m->'privacy'->>'id' IS DISTINCT FROM p.id OR m->'terms'->>'contentHash' IS DISTINCT FROM t."contentHash" OR m->'privacy'->>'contentHash' IS DISTINCT FROM p."contentHash" OR m->'semantics'->>'terms' IS DISTINCT FROM 'AGREEMENT' OR m->'semantics'->>'privacy' IS DISTINCT FROM 'ACKNOWLEDGMENT' OR m->'semantics'->>'optionalConsent' IS DISTINCT FROM 'false' OR m->'semantics'->>'customerDpaExecuted' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Invalid legal manifest'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_publication_validate BEFORE INSERT ON "LegalPublication" FOR EACH ROW EXECUTE FUNCTION legal_publication_validate();
CREATE FUNCTION legal_control_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Invalid legal control revision'; END IF;
 IF NEW."publicationId" IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM "LegalEvidenceEvent" e WHERE e."publicationId"=NEW."publicationId" AND e.type='PUBLISHED') OR EXISTS(SELECT 1 FROM "LegalEvidenceEvent" e WHERE e."publicationId"=NEW."publicationId" AND e.type IN ('SUPERSEDED','WITHDRAWN'))) THEN RAISE EXCEPTION 'Inactive legal publication'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_control_validate BEFORE UPDATE ON "LegalPublicationControl" FOR EACH ROW EXECUTE FUNCTION legal_control_validate();
CREATE FUNCTION legal_subject_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW."createdAt"<>OLD."createdAt" OR OLD."userId" IS NULL OR NEW."userId" IS NOT NULL OR OLD."detachedAt" IS NOT NULL OR NEW."detachedAt" IS NULL OR NEW."retentionReviewReference" IS NULL OR NEW."retentionReviewReference" NOT LIKE 'SYNTHETIC:%' THEN RAISE EXCEPTION 'Legal subject rebinding rejected'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_subject_validate BEFORE UPDATE ON "LegalEvidenceSubject" FOR EACH ROW EXECUTE FUNCTION legal_subject_validate();
CREATE FUNCTION legal_presentation_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "LegalPublicationControl" c JOIN "LegalPublication" p ON p.id=c."publicationId" JOIN "LegalEvidenceSubject" s ON s.id=NEW."subjectId" WHERE c.id='REHEARSAL' AND c."publicationId"=NEW."publicationId" AND c.revision=NEW."controlRevision" AND s."userId" IS NOT NULL AND s."detachedAt" IS NULL AND p."effectiveAt"<=NEW."presentedAt") THEN RAISE EXCEPTION 'Invalid legal presentation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_presentation_validate BEFORE INSERT ON "LegalPresentation" FOR EACH ROW EXECUTE FUNCTION legal_presentation_validate();
CREATE FUNCTION legal_receipt_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "LegalPresentation" p JOIN "LegalEvidenceSubject" s ON s.id=p."subjectId" JOIN "LegalPublicationControl" c ON c.id='REHEARSAL' WHERE p.id=NEW."presentationId" AND p."publicationId"=NEW."publicationId" AND p."subjectId"=NEW."subjectId" AND s."userId" IS NOT NULL AND s."detachedAt" IS NULL AND c."publicationId"=p."publicationId" AND c.revision=p."controlRevision" AND NEW."acceptedAt">=p."presentedAt" AND NEW."acceptedAt"<p."expiresAt") THEN RAISE EXCEPTION 'Stale legal acceptance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_receipt_validate BEFORE INSERT ON "LegalAcceptanceEvidence" FOR EACH ROW EXECUTE FUNCTION legal_receipt_validate();
CREATE FUNCTION legal_event_validate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.type='TERMS_AGREED_PRIVACY_ACKNOWLEDGED' THEN
  IF NEW."actorAdminId" IS NOT NULL OR NOT EXISTS(SELECT 1 FROM "LegalAcceptanceEvidence" r WHERE r.id=NEW."receiptId" AND r."subjectId"=NEW."subjectId" AND r."publicationId"=NEW."publicationId" AND NEW."operationKey"=r.id||':ACCEPTED') THEN RAISE EXCEPTION 'Invalid acceptance event'; END IF;
 ELSE
  IF NEW."receiptId" IS NOT NULL OR NOT EXISTS(SELECT 1 FROM "PlatformAdmin" a WHERE a.id=NEW."actorAdminId" AND a.active AND a.role='SUPER_ADMIN') THEN RAISE EXCEPTION 'Legal event administrator required'; END IF;
  IF NEW.type='SUBJECT_DETACHED' THEN
   IF NEW."publicationId" IS NOT NULL OR NOT EXISTS(SELECT 1 FROM "LegalEvidenceSubject" s WHERE s.id=NEW."subjectId" AND s."detachedAt" IS NOT NULL AND s."userId" IS NULL) THEN RAISE EXCEPTION 'Invalid detachment event'; END IF;
  ELSIF NEW."publicationId" IS NULL OR NEW."subjectId" IS NOT NULL THEN RAISE EXCEPTION 'Invalid publication event'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legal_event_validate BEFORE INSERT ON "LegalEvidenceEvent" FOR EACH ROW EXECUTE FUNCTION legal_event_validate();
CREATE FUNCTION legal_evidence_atomic() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='LegalAcceptanceEvidence' THEN
  IF NOT EXISTS(SELECT 1 FROM "LegalEvidenceEvent" e WHERE e."receiptId"=NEW.id AND e.type='TERMS_AGREED_PRIVACY_ACKNOWLEDGED') THEN RAISE EXCEPTION 'Acceptance event required'; END IF;
 ELSE
  IF NEW."detachedAt" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "LegalEvidenceEvent" e WHERE e."subjectId"=NEW.id AND e.type='SUBJECT_DETACHED') THEN RAISE EXCEPTION 'Detachment event required'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER legal_receipt_atomic AFTER INSERT ON "LegalAcceptanceEvidence" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION legal_evidence_atomic();
CREATE CONSTRAINT TRIGGER legal_subject_atomic AFTER UPDATE ON "LegalEvidenceSubject" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION legal_evidence_atomic();
