-- Forward hardening after the first isolated migration rehearsal.
ALTER TABLE "NotificationControl" ADD CHECK (settings = '{}'::jsonb AND "workerLeaseToken" IS NULL AND "workerLeaseUntil" IS NULL);
ALTER TABLE "NotificationSource" ADD CHECK (length("policyVersion") <= 80 AND ("dispositionCode" IS NULL OR length("dispositionCode") <= 80));
ALTER TABLE "NotificationOutbox" ADD CHECK ("templateVersion"='CAPTURE-GENERIC-v1' AND length("templateDigest")=64 AND ("destinationDigest" IS NULL OR length("destinationDigest")=64) AND ("identityBindingDigest" IS NULL OR length("identityBindingDigest")=64) AND ("safeRetryUntil" IS NULL OR ("recipientVerifiedAt" IS NOT NULL AND "safeRetryUntil">"recipientVerifiedAt" AND "safeRetryUntil"<="recipientVerifiedAt"+interval '23 hours')));
CREATE FUNCTION notification_notice_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN RAISE EXCEPTION 'Notice policy changes require a later approved release'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "NotificationSource" s WHERE s.id=NEW."sourceId" AND s.kind='MILESTONE' AND s.milestone=NEW.milestone AND s."canonicalKey"=NEW."obligationKey" AND s."effectiveAt"=NEW."dueAt") THEN RAISE EXCEPTION 'Notice obligation mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_notice_guard BEFORE INSERT OR UPDATE ON "LifecycleNotice" FOR EACH ROW EXECUTE FUNCTION notification_notice_integrity();
CREATE FUNCTION notification_suppression_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."providerEventId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "NotificationProviderEvent" e WHERE e.id=NEW."providerEventId" AND e."providerScope"=NEW."providerScope" AND e."destinationDigest"=NEW."destinationDigest") THEN RAISE EXCEPTION 'Suppression evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_suppression_guard BEFORE INSERT OR UPDATE ON "NotificationSuppression" FOR EACH ROW EXECUTE FUNCTION notification_suppression_integrity();
