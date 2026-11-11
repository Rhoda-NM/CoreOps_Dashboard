-- Forward hardening: PostgreSQL CHECK must reject NULL required fields.
ALTER TABLE "WorkspaceExportRequest" DROP CONSTRAINT "WorkspaceExportRequest_valid";
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT "WorkspaceExportRequest_valid" CHECK (
 "availabilityVersion" IN(1,2) AND "expiresAt">"createdAt" AND "schemaVersion"='workspace-export-v1' AND
 (status<>'PROCESSING' OR "leaseUntil" IS NOT NULL) AND
 (("availabilityVersion"=1 AND ((status='READY' AND artifact IS NOT NULL AND octet_length(artifact)<=8388636 AND "tokenHash" IS NOT NULL AND length("tokenHash")=64 AND "artifactDigest" IS NOT NULL AND length("artifactDigest")=64) OR (status<>'READY' AND artifact IS NULL AND "tokenHash" IS NULL))) OR
 ("availabilityVersion"=2 AND "requesterExternalId" IS NOT NULL AND "requesterEmailHash" IS NOT NULL AND length("requesterEmailHash")=64 AND "tokenHash" IS NULL AND
 ((status='READY' AND artifact IS NOT NULL AND octet_length(artifact)<=8388636 AND "artifactDigest" IS NOT NULL AND length("artifactDigest")=64 AND "generatedAt" IS NOT NULL AND "artifactExpiresAt" IS NOT NULL AND "artifactExpiresAt"="generatedAt"+interval '24 hours' AND "generatedAt">="createdAt" AND "generatedAt"<"expiresAt" AND "artifactKeyVersion" IS NOT NULL AND "artifactKeyVersion"~'^[a-f0-9]{24}$') OR
 (status<>'READY' AND artifact IS NULL))))
);
