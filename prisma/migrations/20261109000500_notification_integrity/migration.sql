-- N-B only: no control can enable external transport or legal notice sufficiency.
ALTER TABLE "NotificationControl" ADD CHECK (NOT enabled AND "configRevision" > 0 AND "discoveryCursor" >= 0 AND octet_length(settings::text) <= 4096);
ALTER TABLE "NotificationOutbox" ADD CHECK (generation > 0 AND version > 0 AND "captureAttempts" >= 0 AND "dispatchedAttempts" >= 0 AND channel = 'EMAIL' AND length("logicalKey") <= 512 AND ("payloadHash" IS NULL OR length("payloadHash") = 64) AND ("frozenPayloadCipher" IS NULL OR octet_length("frozenPayloadCipher") <= 65536));
ALTER TABLE "NotificationSource" ADD CHECK (length("canonicalKey") <= 512 AND (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)) AND ("latestSendAt" IS NULL OR "latestSendAt" >= "scheduledAt"));
ALTER TABLE "NotificationOutbox" ADD CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL));
ALTER TABLE "NotificationDeliveryAttempt" ADD CHECK ("attemptNo" > 0 AND length("payloadHash") = 64 AND ((mode = 'CAPTURE' AND "dispatchedAt" IS NULL AND "providerMessageId" IS NULL AND result IN ('CAPTURE_INTENT','CAPTURED','CAPTURE_ABANDONED')) OR (mode = 'PROVIDER' AND "dispatchedAt" IS NOT NULL AND result NOT IN ('CAPTURE_INTENT','CAPTURED','CAPTURE_ABANDONED'))));
ALTER TABLE "NotificationProviderEvent" ADD CHECK (("attemptId" IS NULL OR "notificationId" IS NOT NULL) AND length("bodyDigest") = 64 AND ("evidenceCipher" IS NULL OR octet_length("evidenceCipher") <= 65536) AND (state <> 'APPLIED' OR ("notificationId" IS NOT NULL AND "providerMessageId" IS NOT NULL AND "occurredAt" IS NOT NULL AND "destinationDigest" IS NOT NULL AND "processedAt" IS NOT NULL)));
ALTER TABLE "NotificationRun" ADD CHECK ("eligibleCount" >= 0 AND "processedCount" >= 0 AND "retryCount" >= 0 AND "failedCount" >= 0 AND "skippedCount" >= 0 AND (summary IS NULL OR octet_length(summary::text) <= 16384));
ALTER TABLE "LifecycleNotice" ADD CHECK (state IN ('OPEN','REVIEW_REQUIRED') AND "resolvedByAdminId" IS NULL AND "resolvedAt" IS NULL AND "resolutionReason" IS NULL AND "evidenceReference" IS NULL);
ALTER TABLE "NotificationSuppression" ADD CHECK (channel = 'EMAIL' AND length("destinationDigest") = 64 AND (active OR ("releasedAt" IS NOT NULL AND "releaseReason" IS NOT NULL)));
CREATE UNIQUE INDEX notification_one_actionable_generation ON "NotificationOutbox" ("logicalKey") WHERE "processingState" IN ('PENDING','CLAIMED','RETRY_PENDING');
CREATE INDEX notification_due ON "NotificationOutbox" ("scheduledAt",priority,id) WHERE "processingState" IN ('PENDING','RETRY_PENDING');
CREATE INDEX notification_abandoned ON "NotificationOutbox" ("leaseUntil",id) WHERE "processingState" = 'CLAIMED';
CREATE INDEX notification_source_due ON "NotificationSource" ("nextReconcileAt",id) WHERE state NOT IN ('AUDIT_ONLY','HISTORICAL_REVIEW');
CREATE INDEX notification_unmatched ON "NotificationProviderEvent" ("receivedAt",id) WHERE state = 'VERIFIED_PENDING';
CREATE INDEX notification_notice_review ON "LifecycleNotice" ("dueAt",id) WHERE state IN ('OPEN','REVIEW_REQUIRED');
ALTER TABLE "NotificationOutbox" ADD CHECK (kind IN ('QUOTE_READY', 'QUOTE_ACCEPTED', 'PAYMENT_CLAIM_RECEIVED', 'PAYMENT_REVIEW_REQUIRED', 'PAYMENT_VERIFIED', 'PAYMENT_REVIEW_UPDATED', 'PAYMENT_STATUS_CHANGED', 'COMMERCIAL_REQUEST_CLOSED', 'SUBSCRIPTION_CONFIRMED', 'RENEWAL_APPROACHING', 'EXPIRED_GRACE_STARTED', 'GRACE_ENDING', 'WORKSPACE_ARCHIVED', 'CANCELLATION_WARNING', 'WORKSPACE_CANCELED', 'RETENTION_END_APPROACHING_30', 'RETENTION_END_APPROACHING_7', 'EXPORT_REQUEST_ACCEPTED', 'EXPORT_AVAILABLE', 'EXPORT_PREPARATION_FAILED', 'EXPORT_UNAVAILABLE', 'RECOVERY_REQUEST_ACCEPTED', 'RECOVERY_REVIEW_REQUIRED', 'RECOVERY_REVIEW_UPDATED', 'RECOVERY_ACCESS_WITHDRAWN', 'RECOVERY_ACCESS_EXPIRED'));
ALTER TABLE "NotificationControl" ADD CHECK (key = 'GLOBAL' OR key IN ('kind:QUOTE_READY','kind:QUOTE_ACCEPTED','kind:PAYMENT_CLAIM_RECEIVED','kind:PAYMENT_REVIEW_REQUIRED','kind:PAYMENT_VERIFIED','kind:PAYMENT_REVIEW_UPDATED','kind:PAYMENT_STATUS_CHANGED','kind:COMMERCIAL_REQUEST_CLOSED','kind:SUBSCRIPTION_CONFIRMED','kind:RENEWAL_APPROACHING','kind:EXPIRED_GRACE_STARTED','kind:GRACE_ENDING','kind:WORKSPACE_ARCHIVED','kind:CANCELLATION_WARNING','kind:WORKSPACE_CANCELED','kind:RETENTION_END_APPROACHING_30','kind:RETENTION_END_APPROACHING_7','kind:EXPORT_REQUEST_ACCEPTED','kind:EXPORT_AVAILABLE','kind:EXPORT_PREPARATION_FAILED','kind:EXPORT_UNAVAILABLE','kind:RECOVERY_REQUEST_ACCEPTED','kind:RECOVERY_REVIEW_REQUIRED','kind:RECOVERY_REVIEW_UPDATED','kind:RECOVERY_ACCESS_WITHDRAWN','kind:RECOVERY_ACCESS_EXPIRED'));

CREATE FUNCTION notification_source_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j jsonb := to_jsonb(NEW); f text; tab text; owner_id text; e record; n int;
BEGIN
 IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) - ARRAY['state','nextReconcileAt','leaseToken','leaseUntil','dispositionCode','lifecycleEventId']) IS DISTINCT FROM (j - ARRAY['state','nextReconcileAt','leaseToken','leaseUntil','dispositionCode','lifecycleEventId']) THEN RAISE EXCEPTION 'Immutable notification source'; END IF;
 IF TG_OP = 'UPDATE' AND OLD."lifecycleEventId" IS NOT NULL AND OLD."lifecycleEventId" IS DISTINCT FROM NEW."lifecycleEventId" THEN RAISE EXCEPTION 'Immutable event binding'; END IF;
 IF NEW.scope <> 'TENANT' OR NEW."workspaceId" IS NULL OR NEW."subjectUserId" IS NOT NULL OR NEW."accountOperationId" IS NOT NULL OR NEW."incidentKey" IS NOT NULL THEN RAISE EXCEPTION 'Unapproved notification scope'; END IF;
 -- ACCOUNT and PLATFORM are representable but no producer contract is approved in N-B.
 FOREACH f IN ARRAY ARRAY['requestId','paymentId','receiptId','periodId','auditLogId','platformAuditId','lifecycleEventId'] LOOP
  IF j->>f IS NOT NULL THEN
   tab := CASE f WHEN 'requestId' THEN 'SubscriptionRequest' WHEN 'paymentId' THEN 'SubscriptionPayment' WHEN 'receiptId' THEN 'SubscriptionPaymentReceipt' WHEN 'periodId' THEN 'SubscriptionPeriod' WHEN 'auditLogId' THEN 'AuditLog' WHEN 'platformAuditId' THEN 'PlatformAuditEvent' ELSE 'WorkspaceLifecycleEvent' END;
   EXECUTE format('SELECT "workspaceId" FROM %I WHERE id = $1',tab) INTO owner_id USING j->>f;
   IF owner_id IS DISTINCT FROM NEW."workspaceId" THEN RAISE EXCEPTION 'Notification tenant mismatch'; END IF;
  END IF;
 END LOOP;
 IF NEW."reversalId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SubscriptionPaymentReversal" r JOIN "SubscriptionPaymentReceipt" p ON p.id = r."receiptId" WHERE r.id = NEW."reversalId" AND p."workspaceId" = NEW."workspaceId" AND p.id = NEW."receiptId") THEN RAISE EXCEPTION 'Reversal tenant mismatch'; END IF;
 n := num_nonnulls(NEW."requestId",NEW."paymentId",NEW."receiptId",NEW."reversalId",NEW."periodId",NEW."auditLogId",NEW."platformAuditId",NEW."lifecycleEventId");
 IF NOT (
  (NEW.kind = 'LIFECYCLE' AND NEW."lifecycleEventId" IS NOT NULL AND n = 1 AND NEW.milestone IS NULL) OR
  (NEW.kind = 'MILESTONE' AND NEW."periodId" IS NOT NULL AND n = 1 + CASE WHEN NEW."lifecycleEventId" IS NULL THEN 0 ELSE 1 END AND NEW.milestone IN ('RENEWAL_7','EXPIRY','GRACE_5','ARCHIVE','CANCEL_46','CANCEL','RETENTION_30','RETENTION_7')) OR
  (NEW.kind IN ('QUOTE','QUOTE_ACCEPTED') AND NEW."requestId" IS NOT NULL AND n = 1) OR
  (NEW.kind = 'PAYMENT_SUBMITTED' AND NEW."paymentId" IS NOT NULL AND n = 1) OR
  (NEW.kind = 'RECEIPT' AND NEW."receiptId" IS NOT NULL AND n = 1) OR
  (NEW.kind = 'REVERSAL' AND NEW."reversalId" IS NOT NULL AND NEW."receiptId" IS NOT NULL AND n = 2) OR
  (NEW.kind = 'PERIOD' AND NEW."periodId" IS NOT NULL AND n = 1) OR
  (NEW.kind = 'PAYMENT_REJECTED' AND NEW."paymentId" IS NOT NULL AND NEW."platformAuditId" IS NOT NULL AND n = 2) OR
  (NEW.kind = 'REQUEST_CLOSED' AND NEW."requestId" IS NOT NULL AND NEW."platformAuditId" IS NOT NULL AND n = 2) OR
  (NEW.kind = 'CHECKOUT_AUDIT' AND NEW."auditLogId" IS NOT NULL AND n = 1)
 ) THEN RAISE EXCEPTION 'Invalid notification pointer contract'; END IF;
 IF NEW.kind IN ('PAYMENT_REJECTED','REQUEST_CLOSED') AND NOT EXISTS (SELECT 1 FROM "PlatformAuditEvent" a WHERE a.id=NEW."platformAuditId" AND a.action=CASE NEW.kind WHEN 'PAYMENT_REJECTED' THEN 'PAYMENT_SUBMISSION_REJECTED' ELSE 'REQUEST_CLOSED' END AND a."resourceId"=COALESCE(NEW."paymentId",NEW."requestId")) THEN RAISE EXCEPTION 'Invalid commercial evidence'; END IF;
 IF NEW.kind='MILESTONE' AND NEW."lifecycleEventId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "WorkspaceLifecycleEvent" e WHERE e.id=NEW."lifecycleEventId" AND e."episodeId"=NEW."periodId" AND ((NEW.milestone='ARCHIVE' AND e.type='WORKSPACE_ARCHIVED') OR (NEW.milestone='CANCEL' AND e.type='WORKSPACE_CANCELED'))) THEN RAISE EXCEPTION 'Invalid milestone event'; END IF;
 IF NEW.kind='PAYMENT_SUBMITTED' AND EXISTS(SELECT 1 FROM "SubscriptionPayment" p WHERE p.id=NEW."paymentId" AND p.method='PAYSTACK') THEN RAISE EXCEPTION 'Checkout is not payment evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_source_guard BEFORE INSERT OR UPDATE ON "NotificationSource" FOR EACH ROW EXECUTE FUNCTION notification_source_integrity();

CREATE FUNCTION notification_outbox_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."noticeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "LifecycleNotice" n WHERE n.id=NEW."noticeId" AND n."sourceId"=NEW."sourceId") THEN RAISE EXCEPTION 'Notice source mismatch'; END IF;
 IF NEW.generation <> 1 OR NEW."replacesId" IS NOT NULL THEN RAISE EXCEPTION 'Replacement review unavailable in N-B'; END IF;
 IF NEW."providerScope" NOT LIKE 'capture:%' OR NEW."providerMessageId" IS NOT NULL OR NEW."deliveryOutcome" <> 'NOT_SENT' OR NEW."dispatchedAttempts" <> 0 OR NEW."firstDispatchedAt" IS NOT NULL OR NEW."acceptedAt" IS NOT NULL OR NEW."deliveredAt" IS NOT NULL OR NEW."bouncedAt" IS NOT NULL OR NEW."complainedAt" IS NOT NULL OR NEW."frozenPayloadCipher" IS NOT NULL THEN RAISE EXCEPTION 'External delivery unavailable in N-B'; END IF;
 IF NEW."payloadHash" IS NOT NULL AND (NEW."destinationDigest" IS NULL OR NEW."identityBindingDigest" IS NULL OR NEW."recipientVerifiedAt" IS NULL) THEN RAISE EXCEPTION 'Missing verified capture binding'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD) - ARRAY['processingState','leaseToken','leaseUntil','version','captureAttempts','nextAttemptAt','payloadHash','destinationDigest','identityBindingDigest','recipientVerifiedAt','safeRetryUntil','captureId','lastFailureCode','completedAt']) IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['processingState','leaseToken','leaseUntil','version','captureAttempts','nextAttemptAt','payloadHash','destinationDigest','identityBindingDigest','recipientVerifiedAt','safeRetryUntil','captureId','lastFailureCode','completedAt']) THEN RAISE EXCEPTION 'Immutable notification identity'; END IF;
  IF OLD."payloadHash" IS NOT NULL AND ROW(OLD."payloadHash",OLD."destinationDigest",OLD."identityBindingDigest",OLD."recipientVerifiedAt",OLD."safeRetryUntil") IS DISTINCT FROM ROW(NEW."payloadHash",NEW."destinationDigest",NEW."identityBindingDigest",NEW."recipientVerifiedAt",NEW."safeRetryUntil") THEN RAISE EXCEPTION 'Immutable frozen capture'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_outbox_guard BEFORE INSERT OR UPDATE ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION notification_outbox_integrity();
CREATE FUNCTION notification_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='NotificationDeliveryAttempt' THEN
  IF (to_jsonb(OLD)-ARRAY['completedAt','result','captureId','responseCategory','retryEligible']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['completedAt','result','captureId','responseCategory','retryEligible']) OR OLD."completedAt" IS NOT NULL THEN RAISE EXCEPTION 'Immutable attempt evidence'; END IF;
 ELSE
  IF (to_jsonb(OLD)-ARRAY['state','failureCode','processedAt','notificationId','attemptId']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['state','failureCode','processedAt','notificationId','attemptId']) THEN RAISE EXCEPTION 'Immutable provider evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_attempt_guard BEFORE UPDATE ON "NotificationDeliveryAttempt" FOR EACH ROW EXECUTE FUNCTION notification_evidence_immutable();
CREATE TRIGGER notification_provider_guard BEFORE UPDATE ON "NotificationProviderEvent" FOR EACH ROW EXECUTE FUNCTION notification_evidence_immutable();
CREATE FUNCTION notification_provider_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."notificationId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "NotificationOutbox" o WHERE o.id=NEW."notificationId" AND o."providerScope"=NEW."providerScope" AND o."providerMessageId"=NEW."providerMessageId" AND o."destinationDigest"=NEW."destinationDigest") THEN RAISE EXCEPTION 'Provider mapping mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_provider_mapping_guard BEFORE INSERT OR UPDATE ON "NotificationProviderEvent" FOR EACH ROW EXECUTE FUNCTION notification_provider_mapping();
