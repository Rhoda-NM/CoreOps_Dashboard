-- Forward-only bounded generation window; original v1 deadlines remain untouched.
ALTER TABLE "WorkspaceExportRequest" ADD CONSTRAINT nx_generation_deadline CHECK ("availabilityVersion"<>2 OR ("expiresAt"<="createdAt"+interval '15 minutes' AND (status<>'PROCESSING' OR "leaseUntil"<="expiresAt")));
