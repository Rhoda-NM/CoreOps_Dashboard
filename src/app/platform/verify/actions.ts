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
