-- AlterTable
ALTER TABLE "WorkspaceExportRequest" ADD COLUMN     "artifactExpiresAt" TIMESTAMP(3),
ADD COLUMN     "artifactKeyVersion" TEXT,
ADD COLUMN     "availabilityVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "downloadLeaseToken" TEXT,
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "requesterEmailHash" TEXT,
ADD COLUMN     "requesterExternalId" TEXT;

-- CreateTable
CREATE TABLE "ExportDownloadAuthorization" (
    "id" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ExportDownloadAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExportDownloadAuthorization_tokenHash_key" ON "ExportDownloadAuthorization"("tokenHash");

-- CreateIndex
CREATE INDEX "ExportDownloadAuthorization_requesterId_issuedAt_idx" ON "ExportDownloadAuthorization"("requesterId", "issuedAt");

-- CreateIndex
CREATE INDEX "ExportDownloadAuthorization_exportId_expiresAt_idx" ON "ExportDownloadAuthorization"("exportId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ExportDownloadAuthorization" ADD CONSTRAINT "ExportDownloadAuthorization_exportId_workspaceId_fkey" FOREIGN KEY ("exportId", "workspaceId") REFERENCES "WorkspaceExportRequest"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Existing rows stay v1 with their original deadlines and ciphertext; no backfill.
ALTER TABLE "WorkspaceExportRequest" DROP CONSTRAINT "WorkspaceExportRequest_valid";
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_valid" CHECK (
 "availabilityVersion" IN(1,2) AND "expiresAt">"createdAt" AND "schemaVersion"='workspace-export-v1' AND
 (status<>'PROCESSING' OR "leaseUntil" IS NOT NULL) AND
 (("availabilityVersion"=1 AND ((status='READY' AND artifact IS NOT NULL AND octet_length(artifact)<=8388636 AND length("tokenHash")=64 AND length("artifactDigest")=64) OR (status<>'READY' AND artifact IS NULL AND "tokenHash" IS NULL))) OR
 ("availabilityVersion"=2 AND "requesterExternalId" IS NOT NULL AND length("requesterEmailHash")=64 AND "tokenHash" IS NULL AND
 ((status='READY' AND artifact IS NOT NULL AND octet_length(artifact)<=8388636 AND length("artifactDigest")=64 AND "generatedAt" IS NOT NULL AND "artifactExpiresAt"="generatedAt"+interval '24 hours' AND "generatedAt">="createdAt" AND "generatedAt"<"expiresAt" AND "artifactKeyVersion"~'^[a-f0-9]{24}$') OR
 (status<>'READY' AND artifact IS NULL))))
);
CREATE INDEX "WorkspaceExportRequest_artifactExpiresAt_idx" ON "WorkspaceExportRequest"("artifactExpiresAt") WHERE status='READY';
CREATE UNIQUE INDEX "ExportDownloadAuthorization_one_pending" ON "ExportDownloadAuthorization"("exportId") WHERE "consumedAt" IS NULL AND "revokedAt" IS NULL;
ALTER TABLE "ExportDownloadAuthorization" ADD CHECK("tokenHash"~'^[a-f0-9]{64}$' AND "expiresAt">"issuedAt" AND "expiresAt"<="issuedAt"+interval '5 minutes' AND ("consumedAt" IS NULL OR ("consumedAt">="issuedAt" AND "consumedAt"<"expiresAt")) AND ("revokedAt" IS NULL OR "revokedAt">="issuedAt"));
CREATE FUNCTION nx_export_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n bigint; b bigint;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW."availabilityVersion",NEW."requesterExternalId",NEW."requesterEmailHash") IS DISTINCT FROM ROW(OLD."availabilityVersion",OLD."requesterExternalId",OLD."requesterEmailHash") THEN RAISE EXCEPTION 'Immutable export binding'; END IF;
  IF OLD."generatedAt" IS NOT NULL AND ROW(NEW."generatedAt",NEW."artifactExpiresAt",NEW."artifactKeyVersion",NEW."artifactDigest") IS DISTINCT FROM ROW(OLD."generatedAt",OLD."artifactExpiresAt",OLD."artifactKeyVersion",OLD."artifactDigest") THEN RAISE EXCEPTION 'Immutable artifact identity'; END IF;
  IF OLD.artifact IS NOT NULL AND NEW.artifact IS NOT NULL AND OLD.artifact IS DISTINCT FROM NEW.artifact THEN RAISE EXCEPTION 'Immutable ciphertext'; END IF;
 END IF;
 IF NEW."availabilityVersion"=2 AND NEW.artifact IS NOT NULL AND (TG_OP='INSERT' OR OLD.artifact IS NULL) THEN
  PERFORM pg_advisory_xact_lock(811090003,1);
  SELECT count(*),coalesce(sum(octet_length(artifact)),0) INTO n,b FROM "WorkspaceExportRequest" WHERE artifact IS NOT NULL AND id<>NEW.id;
  IF n>=100 OR b+octet_length(NEW.artifact)>838860800 THEN RAISE EXCEPTION 'Export storage capacity'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER nx_export_identity BEFORE INSERT OR UPDATE ON "WorkspaceExportRequest" FOR EACH ROW EXECUTE FUNCTION nx_export_identity();
CREATE FUNCTION nx_authorization_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "WorkspaceExportRequest"; g "WorkspaceRecoveryRequest";
BEGIN
 IF TG_OP='UPDATE' AND (ROW(NEW.id,NEW."exportId",NEW."workspaceId",NEW."requesterId",NEW."tokenHash",NEW."issuedAt",NEW."expiresAt") IS DISTINCT FROM ROW(OLD.id,OLD."exportId",OLD."workspaceId",OLD."requesterId",OLD."tokenHash",OLD."issuedAt",OLD."expiresAt") OR (OLD."consumedAt" IS NOT NULL AND OLD."consumedAt" IS DISTINCT FROM NEW."consumedAt") OR (OLD."revokedAt" IS NOT NULL AND OLD."revokedAt" IS DISTINCT FROM NEW."revokedAt")) THEN RAISE EXCEPTION 'Immutable download authorization'; END IF;
 SELECT * INTO e FROM "WorkspaceExportRequest" WHERE id=NEW."exportId" AND "workspaceId"=NEW."workspaceId";
 IF NOT FOUND OR e."availabilityVersion"<>2 OR e."requesterId"<>NEW."requesterId" OR e."generatedAt" IS NULL OR NEW."issuedAt"<e."generatedAt" OR NEW."expiresAt">e."artifactExpiresAt" THEN RAISE EXCEPTION 'Invalid authorization parent/deadline'; END IF;
 IF e."recoveryId" IS NOT NULL THEN SELECT * INTO g FROM "WorkspaceRecoveryRequest" WHERE id=e."recoveryId";IF g."expiresAt" IS NULL OR NEW."expiresAt">g."expiresAt" THEN RAISE EXCEPTION 'Authorization outlives grant'; END IF; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER nx_authorization_guard BEFORE INSERT OR UPDATE ON "ExportDownloadAuthorization" FOR EACH ROW EXECUTE FUNCTION nx_authorization_guard();
