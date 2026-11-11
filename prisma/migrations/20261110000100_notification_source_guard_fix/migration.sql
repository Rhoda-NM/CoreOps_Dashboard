-- Forward fix: avoid an unassigned PL/pgSQL record shadowing query aliases.
CREATE OR REPLACE FUNCTION notification_source_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j jsonb := to_jsonb(NEW); f text; tab text; owner_id text; n int;
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
