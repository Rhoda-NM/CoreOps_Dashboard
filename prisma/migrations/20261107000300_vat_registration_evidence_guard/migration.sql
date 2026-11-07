-- Forward fix: SQL CHECK treats NULL as unknown, so require positive evidence explicitly.
ALTER TABLE "TaxConfiguration" ADD CONSTRAINT "TaxConfiguration_registration_evidence_required" CHECK ("registrationStatus"<>'REGISTERED' OR coalesce(length(trim("registrationReference")),0)>0);
