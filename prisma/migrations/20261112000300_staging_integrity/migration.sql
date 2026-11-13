BEGIN;
-- Forward-only adjustment: preserve existing schedules and add distinct
-- non-registration semantics without classifying them as exempt supplies.
ALTER TABLE "TaxConfiguration" DROP CONSTRAINT "TaxConfiguration_legal_basis";
ALTER TABLE "TaxConfiguration" ADD CONSTRAINT "TaxConfiguration_legal_basis" CHECK (
 version>0 AND rate>=0 AND rate<100 AND ("registrationStatus"='REGISTERED' OR rate=0)
 AND ("registrationStatus"<>'REGISTERED' OR length(trim("registrationReference"))>0)
 AND jsonb_typeof("allowedTreatments")='array' AND jsonb_array_length("allowedTreatments")>0
 AND "allowedTreatments" <@ '["INCLUSIVE","EXCLUSIVE","EXEMPT","NON_VAT_REGISTERED"]'::jsonb
 AND (NOT ("allowedTreatments" ? 'NON_VAT_REGISTERED') OR ("registrationStatus"='NOT_REGISTERED' AND rate=0))
 AND length(trim("approvalReference"))>=10
);
COMMIT;
