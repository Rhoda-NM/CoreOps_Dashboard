import "server-only";
import { brand } from "@/config/brand";
import { getAuthConfiguration } from "@/config/auth";

type ClerkConfiguration = {
  display_config?: { application_name?: string; support_email?: string; terms_url?: string; privacy_policy_url?: string };
  user_settings?: { sign_up?: { legal_consent_enabled?: boolean }; actions?: { delete_self?: boolean } };
};

// Public configuration only. No user IDs, credentials, or account records.
export async function readClerkConfiguration(): Promise<ClerkConfiguration | null> {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || !/^pk_(test|live)_/.test(key)) return null;
  const host = Buffer.from(key.slice(8), "base64").toString().replace(/\$$/, "");
  if (!/^[a-z0-9.-]+$/i.test(host) || host.includes("..")) return null;
  try {
    const result = await fetch(`https://${host}/v1/environment`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!result.ok) return null;
    return await result.json();
  } catch { return null; }
}

export async function isRegistrationReady() {
  const config = getAuthConfiguration();
  if (!config.requireLegal) return true; // Development only; not a consent claim.
  if (!config.legalReady || !config.googleScopesReviewed || !config.supportEmail) return false;
  const remote = await readClerkConfiguration();
  return remote?.user_settings?.sign_up?.legal_consent_enabled === true &&
    remote.display_config?.terms_url === config.termsUrl &&
    remote.display_config?.privacy_policy_url === config.privacyUrl &&
    remote.display_config?.application_name === brand.name &&
    remote.display_config?.support_email === config.supportEmail &&
    remote.user_settings.actions?.delete_self === false;
}
