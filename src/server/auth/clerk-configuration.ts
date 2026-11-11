import "server-only";
import { getAuthConfiguration } from "@/config/auth";
import { registrationRequirements, type ClerkPublicConfiguration } from "@/lib/auth/registration-readiness";

// Public configuration only. No user IDs, credentials, or account records.
export async function readClerkConfiguration(): Promise<ClerkPublicConfiguration | null> {
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
  return registrationRequirements(config, remote).ready;
}
