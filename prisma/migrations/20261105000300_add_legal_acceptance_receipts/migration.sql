-- Additive only. No existing identities, memberships, or business data change.
BEGIN;
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "termsUrl" TEXT NOT NULL,
    "privacyUrl" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'COREOPS_EXPLICIT',
    "clerkLegalAcceptedAt" TIMESTAMP(3),
    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LegalAcceptance_userId_termsVersion_privacyVersion_key" ON "LegalAcceptance"("userId", "termsVersion", "privacyVersion");
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx" ON "LegalAcceptance"("userId", "acceptedAt");
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
