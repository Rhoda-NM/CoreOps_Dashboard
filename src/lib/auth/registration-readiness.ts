import type { getAuthConfiguration } from "../../config/auth";
import { brand } from "../../config/brand";

export type ClerkPublicConfiguration = {
  display_config?: { application_name?: string; support_email?: string; terms_url?: string; privacy_policy_url?: string };
  user_settings?: { sign_up?: { legal_consent_enabled?: boolean }; actions?: { delete_self?: boolean } };
};

// The same requirements drive the server gate and the operator's read-only
// inspector. A diagnostic result never changes configuration or grants access.
export function registrationRequirements(config: ReturnType<typeof getAuthConfiguration>, remote: ClerkPublicConfiguration | null) {
  const checks = [
    { id: "legal_versions_effective", passed: config.legalReady, requirement: "Approved Terms and Privacy versions, HTTPS URLs and effective dates must be configured and in effect." },
    { id: "google_scope_review", passed: config.googleScopesReviewed, requirement: "Review actual Google identity scopes before recording scope-review completion." },
    { id: "support_address", passed: Boolean(config.supportEmail), requirement: "Configure a valid support/recovery address." },
    { id: "clerk_environment_available", passed: remote !== null, requirement: "The selected Clerk instance must return its public configuration." },
    { id: "clerk_express_consent", passed: remote?.user_settings?.sign_up?.legal_consent_enabled === true, requirement: "Enable Clerk express legal consent only after the documents are approved." },
    { id: "clerk_terms_url", passed: Boolean(config.termsUrl) && remote?.display_config?.terms_url === config.termsUrl, requirement: "Clerk's Terms URL must exactly match the approved configured URL." },
    { id: "clerk_privacy_url", passed: Boolean(config.privacyUrl) && remote?.display_config?.privacy_policy_url === config.privacyUrl, requirement: "Clerk's Privacy URL must exactly match the approved configured URL." },
    { id: "clerk_branding", passed: remote?.display_config?.application_name === brand.name, requirement: `Set the Clerk application display name to ${brand.name}.` },
    { id: "clerk_support_address", passed: Boolean(config.supportEmail) && remote?.display_config?.support_email === config.supportEmail, requirement: "Clerk's support email must match the configured support/recovery address." },
    { id: "clerk_self_deletion_disabled", passed: remote?.user_settings?.actions?.delete_self === false, requirement: "Disable Clerk self-service deletion; retain the verified final-owner recovery/deletion procedure." },
  ];
  return { ready: checks.every(check => check.passed), checks };
}
