import "server-only";
import { stagingRequested } from "../staging/config";
import { requireCentralHost } from "../routing/request-context";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../db/prisma";
import { redirect } from "next/navigation";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { AccessError } from "../authorization/errors";
import type { PlatformRole } from "@prisma/client";
import { Pay1AdmissionError } from "../preview/pay1-error";
type EntryReason = "READY" | "SIGN_IN_REQUIRED" | "IDENTITY_UNAVAILABLE" | "PAY1_WINDOW_CLOSED" | "PAY1_ADMISSION_DENIED" | "ADMIN_NOT_FOUND" | "ADMIN_LOOKUP_UNAVAILABLE" | "MFA_NOT_ENROLLED" | "MFA_CLAIMS_MISSING" | "MFA_CLAIMS_INVALID" | "MFA_NOT_VERIFIED" | "MFA_STALE" | "MFA_CHECK_FAILED";
function diagnostic(reason: EntryReason, checks: Record<string, boolean> = {}) {
  if (process.env.VERCEL_ENV !== "preview" || (process.env.COREOPS_PAY1_PREVIEW_ENABLED !== "true" && !stagingRequested())) return;
  // Closed codes and locally calculated booleans only. Never pass exceptions,
  // identities, claim contents, role records or provider responses to this sink.
  try { console.info(JSON.stringify({ event: "PLATFORM_ENTRY_CHECK", reason, ...checks })); } catch { /* No raw fallback. */ }
}
export type PlatformPermission = "directory" | "billing" | "activate" | "catalog" | "audit";
export function platformCan(role: PlatformRole, permission: PlatformPermission) {
  return role === "SUPER_ADMIN" || (role === "BILLING_ADMIN" && ["directory", "billing", "audit"].includes(permission)) || (role === "SUPPORT" && ["directory", "audit"].includes(permission));
}
export async function platformEntry() {
  await requireCentralHost();
  const session = await auth();
  if (!session.userId) {
    diagnostic("SIGN_IN_REQUIRED");
    return { admin: null, signedIn: false, mfa: false, canReverify: false };
  }
  let identity;
  try { identity = await requireClerkIdentity(); } catch (error) {
    if (!(error instanceof AccessError)) throw error; // Preserve Next control flow.
    const reason = error instanceof Pay1AdmissionError ? (error.reason === "PAY1_WINDOW_CLOSED" ? "PAY1_WINDOW_CLOSED" : "PAY1_ADMISSION_DENIED") : "IDENTITY_UNAVAILABLE";
    diagnostic(reason);
    return { admin: null, signedIn: true, mfa: false, canReverify: false };
  }
  let admin;
  try { admin = await prisma.platformAdmin.findFirst({ where: { active: true, user: { externalId: identity.id, platformSuspended: false } } }); } catch {
    diagnostic("ADMIN_LOOKUP_UNAVAILABLE");
    throw new AccessError("FORBIDDEN");
  }
  const factors = session.sessionClaims?.fva;
  const enrolled = !!identity.twoFactorEnabled;
  const present = factors !== undefined;
  const valid = Array.isArray(factors) && factors.length === 2 && factors.every(age => Number.isInteger(age) && age >= -1);
  const verified = valid && factors.every(age => age >= 0);
  const strict = !!session.has({ reverification: "strict_mfa" });
  const mfa = enrolled && verified && strict;
  const reason: EntryReason = !admin ? "ADMIN_NOT_FOUND" : !enrolled ? "MFA_NOT_ENROLLED" : !present ? "MFA_CLAIMS_MISSING" : !valid ? "MFA_CLAIMS_INVALID" : !verified ? "MFA_NOT_VERIFIED" : !strict ? (factors.some(age => age >= 10) ? "MFA_STALE" : "MFA_CHECK_FAILED") : "READY";
  diagnostic(reason, { adminFound: !!admin, mfaEnrolled: enrolled, fvaPresent: present, fvaValid: valid, factorsVerified: verified, strictMfa: strict });
  return { admin, signedIn: true, mfa, canReverify: !!admin && enrolled && !mfa };
}
export async function requirePlatform(permission: PlatformPermission = "directory") {
  const entry = await platformEntry();
  if (!entry.signedIn) redirect("/platform/sign-in");
  if (!entry.admin || !platformCan(entry.admin.role, permission)) throw new AccessError("FORBIDDEN");
  if (!entry.mfa) {
    if (entry.canReverify) redirect("/platform/verify");
    throw new AccessError("FORBIDDEN");
  }
  return entry.admin;
}
