"use server";
import { reverificationError } from "@clerk/nextjs/server";
import { platformEntry } from "@/server/commercial/platform-auth";
import { SetupRequestError } from "@/server/staging/setup-handoff";

// This action releases no platform data and performs no mutation. Every retry
// rechecks live identity, PAY-1 admission and the active database-backed role.
export async function verifyPlatformSession() {
  const entry = await platformEntry();
  if (!entry.signedIn || !entry.admin || (!entry.mfa && !entry.canReverify)) return { status: "denied" as const };
  if (!entry.mfa) return reverificationError("strict_mfa");
  return { status: "verified" as const };
}

// No setup mutation occurs in the browser. The existing external CLI remains
// responsible for reviewed target validation and the audited transaction.
export async function authorizeStagingSetup(request: string) {
  try {
    if (typeof request !== "string" || request.length > 20000) return { status: "denied" as const };
    const { authorizeSetupRequest } = await import("@/server/staging/setup-authorization");
    return await authorizeSetupRequest(JSON.parse(request));
  } catch (error) {
    const code = error instanceof SetupRequestError ? error.code : "SETUP_AUTHORIZATION_UNAVAILABLE";
    if (process.env.VERCEL_ENV === "preview") {
      try { console.info(JSON.stringify({ event: "STAGING_SETUP_AUTHORIZATION", code })); } catch { /* No raw fallback. */ }
    }
    return { status: "denied" as const, code };
  }
}
