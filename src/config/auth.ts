// Provisional configuration supplied by the operator. Approval and effective
// dates must be supplied explicitly; version labels alone never imply consent.
function httpsUrl(value: string | undefined) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : undefined; } catch { return undefined; }
}
function effectiveDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function getAuthConfiguration() {
  const termsUrl = httpsUrl(process.env.COREOPS_TERMS_URL ?? "https://coreops.studio/terms");
  const privacyUrl = httpsUrl(process.env.COREOPS_PRIVACY_URL ?? "https://coreops.studio/privacy");
  const support = (process.env.COREOPS_SUPPORT_EMAIL ?? "info@stravectsystems.com").trim();
  const supportEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(support) ? support : undefined;
  const termsVersion = (process.env.COREOPS_TERMS_VERSION ?? "COREOPS-TOS-v1.0").trim();
  const privacyVersion = (process.env.COREOPS_PRIVACY_VERSION ?? "COREOPS-PRIV-v1.0").trim();
  const termsEffectiveAt = effectiveDate(process.env.COREOPS_TERMS_EFFECTIVE_AT);
  const privacyEffectiveAt = effectiveDate(process.env.COREOPS_PRIVACY_EFFECTIVE_AT);
  const legalConfigured = Boolean(termsUrl && privacyUrl && termsVersion && privacyVersion);
  const legalApproved = process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED === "true";
  const legalReady = Boolean(legalConfigured && legalApproved && termsEffectiveAt && privacyEffectiveAt && Date.parse(termsEffectiveAt) <= Date.now() && Date.parse(privacyEffectiveAt) <= Date.now());
  return {
    termsUrl, privacyUrl, supportEmail, termsVersion, privacyVersion, termsEffectiveAt, privacyEffectiveAt,
    serviceProvider: "Stravect Systems", legalConfigured, legalApproved, legalReady,
    googleScopesReviewed: process.env.COREOPS_GOOGLE_IDENTITY_SCOPES_REVIEWED === "true",
    // This gates registration/provisioning, never activates consent in Clerk.
    requireLegal: process.env.NODE_ENV === "production" || process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE === "true",
  };
}
