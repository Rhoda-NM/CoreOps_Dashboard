-- Additive vocabulary; non-registration is not an exempt or zero-rated supply.
ALTER TYPE "TaxTreatment" ADD VALUE IF NOT EXISTS 'NON_VAT_REGISTERED';
