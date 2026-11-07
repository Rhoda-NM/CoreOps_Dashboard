BEGIN;
ALTER TABLE "SubscriptionRequest" DROP CONSTRAINT "SubscriptionRequest_amounts";
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_amounts" CHECK (("quotedAmount" IS NULL OR "quotedAmount">0) AND ("taxAmount" IS NULL OR "taxAmount">=0) AND ("payableAmount" IS NULL OR ("payableAmount">0 AND "payableAmount"=coalesce("netAmount","quotedAmount")+"taxAmount")) AND ("approvedAt" IS NULL OR ("reviewedById" IS NOT NULL AND "receivingAccountId" IS NOT NULL AND "memberLimit">0 AND "payableAmount" IS NOT NULL AND "taxTreatment"<>'UNCONFIRMED')) AND ("vatRate" IS NULL OR "vatRate" BETWEEN 0 AND 99.9999));
ALTER TABLE "SubscriptionPaymentReceipt" ADD CONSTRAINT "Receipt_confirmation_authority" CHECK (("confirmationSource"='MANUAL' AND method<>'PAYSTACK' AND "verifiedById" IS NOT NULL AND "providerAttemptId" IS NULL) OR ("confirmationSource"='PAYSTACK' AND method='PAYSTACK' AND "verifiedById" IS NULL AND "providerAttemptId" IS NOT NULL AND "taxSnapshot" IS NOT NULL));
ALTER TABLE "TaxConfiguration" ADD CONSTRAINT "TaxConfiguration_legal_basis" CHECK (version>0 AND rate>=0 AND rate<100 AND ("registrationStatus"='REGISTERED' OR rate=0) AND ("registrationStatus"<>'REGISTERED' OR length(trim("registrationReference"))>0) AND jsonb_typeof("allowedTreatments")='array' AND jsonb_array_length("allowedTreatments")>0 AND "allowedTreatments" <@ '["INCLUSIVE","EXCLUSIVE","EXEMPT"]'::jsonb AND length(trim("approvalReference"))>=10);
ALTER TABLE "PaystackAttempt" ADD CONSTRAINT "PaystackAttempt_values" CHECK (method='PAYSTACK' AND "expectedMinor">0 AND currency='KES' AND reference ~ '^coreops-(test|live)-[a-z0-9-]+$');
CREATE UNIQUE INDEX "PaystackAttempt_one_unresolved_per_request" ON "PaystackAttempt" ("requestId") WHERE status IN ('CREATED','INITIALIZED','REVIEW');
CREATE FUNCTION coreops_vat_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='TaxConfiguration' THEN RAISE EXCEPTION 'Tax configurations are immutable; create a prospective approved version'; END IF;
 IF OLD."approvedAt" IS NOT NULL AND ROW(NEW."netAmount",NEW."vatRate",NEW."taxSnapshot") IS DISTINCT FROM ROW(OLD."netAmount",OLD."vatRate",OLD."taxSnapshot") THEN RAISE EXCEPTION 'Approved VAT snapshots are immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_tax_configuration BEFORE UPDATE ON "TaxConfiguration" FOR EACH ROW EXECUTE FUNCTION coreops_vat_snapshot_immutable();
CREATE TRIGGER immutable_quote_tax BEFORE UPDATE ON "SubscriptionRequest" FOR EACH ROW EXECUTE FUNCTION coreops_vat_snapshot_immutable();
COMMIT;
