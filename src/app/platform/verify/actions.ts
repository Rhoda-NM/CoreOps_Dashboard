"use server";
import { reverificationError } from "@clerk/nextjs/server";
import { platformEntry } from "@/server/commercial/platform-auth";

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
  } catch { return { status: "denied" as const }; }
}
