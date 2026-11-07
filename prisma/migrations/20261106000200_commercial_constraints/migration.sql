BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE UNIQUE INDEX "SubscriptionRequest_one_open_per_workspace" ON "SubscriptionRequest" ("workspaceId") WHERE status IN ('SUBMITTED','QUOTED','AWAITING_PAYMENT','READY_FOR_ACTIVATION');
CREATE UNIQUE INDEX "SubscriptionPayment_open_reference" ON "SubscriptionPayment" ("receivingAccountId", method, "normalizedReference") WHERE status IN ('SUBMITTED','RECONCILED');
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_no_overlap" EXCLUDE USING gist ("workspaceId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("revokedAt" IS NULL);
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_valid" CHECK ("endsAt">"startsAt" AND "graceEndsAt"="endsAt"+interval '7 days' AND "anchorDay" BETWEEN 1 AND 31 AND "memberLimit">0 AND ("projectLimit" IS NULL OR "projectLimit">0) AND "agreedAmount">0 AND (plan<>'SOLO' OR ("memberLimit"=1 AND NOT "invitationsEnabled")));
ALTER TABLE "SubscriptionPlanOffer" ADD CONSTRAINT "SubscriptionPlanOffer_valid" CHECK (version>0 AND (amount IS NULL OR amount>0) AND ("memberLimit" IS NULL OR "memberLimit">0) AND ("projectLimit" IS NULL OR "projectLimit">0) AND currency~'^[A-Z]{3}$' AND (plan<>'SOLO' OR ("memberLimit"=1 AND NOT "invitationsEnabled")) AND (NOT published OR ("businessApprovedAt" IS NOT NULL AND "approvedById" IS NOT NULL AND "businessApprovalRef" IS NOT NULL AND "taxTreatment"<>'UNCONFIRMED')));
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_amounts" CHECK (("quotedAmount" IS NULL OR "quotedAmount">0) AND ("taxAmount" IS NULL OR "taxAmount">=0) AND ("payableAmount" IS NULL OR ("payableAmount">0 AND "payableAmount"="quotedAmount"+"taxAmount")) AND ("approvedAt" IS NULL OR ("reviewedById" IS NOT NULL AND "receivingAccountId" IS NOT NULL AND "memberLimit">0 AND "payableAmount" IS NOT NULL AND "taxTreatment"<>'UNCONFIRMED')));
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_positive" CHECK ("proposedAmount">0 AND "normalizedReference"=upper(trim("submittedReference")));
ALTER TABLE "SubscriptionPaymentReceipt" ADD CONSTRAINT "SubscriptionPaymentReceipt_positive" CHECK (amount>0 AND "transactionReference"=upper(trim("transactionReference")));
ALTER TABLE "PaymentReceivingAccount" ADD CONSTRAINT "PaymentReceivingAccount_approved" CHECK (NOT active OR ("verifiedAt" IS NOT NULL AND "verifiedById" IS NOT NULL));

CREATE FUNCTION coreops_commercial_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='SubscriptionPlanOffer' THEN
  IF OLD."businessApprovedAt" IS NOT NULL AND (to_jsonb(NEW)-'published') IS DISTINCT FROM (to_jsonb(OLD)-'published') THEN RAISE EXCEPTION 'Approved offers are immutable; create a new version'; END IF;
 ELSIF TG_TABLE_NAME='SubscriptionRequest' THEN
  IF ROW(NEW."workspaceId",NEW."subscriptionId",NEW."submittedByUserId",NEW."offerId",NEW.type,NEW."idempotencyKey",NEW."payloadHash",NEW.plan,NEW.interval,NEW."offerVersion",NEW."catalogAmount",NEW.currency,NEW."projectLimit",NEW."invitationsEnabled",NEW.features,NEW."taxTreatment",NEW."createdAt") IS DISTINCT FROM ROW(OLD."workspaceId",OLD."subscriptionId",OLD."submittedByUserId",OLD."offerId",OLD.type,OLD."idempotencyKey",OLD."payloadHash",OLD.plan,OLD.interval,OLD."offerVersion",OLD."catalogAmount",OLD.currency,OLD."projectLimit",OLD."invitationsEnabled",OLD.features,OLD."taxTreatment",OLD."createdAt") THEN RAISE EXCEPTION 'Request snapshot is immutable'; END IF;
  IF OLD."approvedAt" IS NOT NULL AND ROW(NEW."quotedAmount",NEW."taxAmount",NEW."payableAmount",NEW."memberLimit",NEW."receivingAccountId",NEW."paymentInstructions",NEW."approvedAt",NEW."reviewedById") IS DISTINCT FROM ROW(OLD."quotedAmount",OLD."taxAmount",OLD."payableAmount",OLD."memberLimit",OLD."receivingAccountId",OLD."paymentInstructions",OLD."approvedAt",OLD."reviewedById") THEN RAISE EXCEPTION 'Approved quote is immutable'; END IF;
 ELSIF TG_TABLE_NAME='SubscriptionPeriod' THEN
  IF (to_jsonb(NEW)-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'revokedAt') OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt") THEN RAISE EXCEPTION 'Paid periods are immutable except first revocation'; END IF;
 ELSE RAISE EXCEPTION 'Verified receipts and audit events are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_offer BEFORE UPDATE ON "SubscriptionPlanOffer" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();
CREATE TRIGGER immutable_quote BEFORE UPDATE ON "SubscriptionRequest" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();
CREATE TRIGGER immutable_period BEFORE UPDATE ON "SubscriptionPeriod" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();
CREATE TRIGGER immutable_receipt BEFORE UPDATE ON "SubscriptionPaymentReceipt" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();
CREATE TRIGGER immutable_reversal BEFORE UPDATE ON "SubscriptionPaymentReversal" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();
CREATE TRIGGER immutable_platform_audit BEFORE UPDATE ON "PlatformAuditEvent" FOR EACH ROW EXECUTE FUNCTION coreops_commercial_immutable();

-- Provisional catalog only: no published prices, tax assumptions, trials or billing instructions.
INSERT INTO "SubscriptionPlanOffer" (id,plan,interval,version,name,amount,currency,"memberLimit","invitationsEnabled",features,"taxTreatment",published) VALUES
 ('draft-solo-monthly-v1','SOLO','MONTHLY',1,'Solo',1500,'KES',1,false,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-solo-annual-v1','SOLO','ANNUAL',1,'Solo',15000,'KES',1,false,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-starter-monthly-v1','STARTER','MONTHLY',1,'Starter',2900,'KES',3,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-starter-annual-v1','STARTER','ANNUAL',1,'Starter',29000,'KES',3,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-business-monthly-v1','BUSINESS','MONTHLY',1,'Business',7900,'KES',10,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-business-annual-v1','BUSINESS','ANNUAL',1,'Business',79000,'KES',10,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-enterprise-monthly-v1','ENTERPRISE','MONTHLY',1,'Enterprise',NULL,'KES',NULL,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false),
 ('draft-enterprise-annual-v1','ENTERPRISE','ANNUAL',1,'Enterprise',NULL,'KES',NULL,true,'{"clients":true,"projects":true,"tasks":true,"invoices":true,"dashboard":true}','UNCONFIRMED',false);
COMMIT;
