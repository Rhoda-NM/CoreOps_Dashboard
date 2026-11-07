import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../db/prisma";
import { redirect } from "next/navigation";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { AccessError } from "../authorization/errors";
import type { PlatformRole } from "@prisma/client";
export type PlatformPermission = "directory" | "billing" | "activate" | "catalog" | "audit";
export function platformCan(role: PlatformRole, permission: PlatformPermission) {
  return role === "SUPER_ADMIN" || (role === "BILLING_ADMIN" && ["directory", "billing", "audit"].includes(permission)) || (role === "SUPPORT" && ["directory", "audit"].includes(permission));
}
export async function platformEntry() {
  const session = await auth();
  if (!session.userId) return { admin: null, signedIn: false, mfa: false };
  const identity = await requireClerkIdentity();
  const admin = await prisma.platformAdmin.findFirst({ where: { active: true, user: { externalId: identity.id } } });
  const factors = session.sessionClaims?.fva;
  const mfa = !!identity.twoFactorEnabled && Array.isArray(factors) && factors.length === 2 && factors.every(age => Number.isInteger(age) && age >= 0) && session.has({ reverification: "strict_mfa" });
  return { admin, signedIn: true, mfa };
}
export async function requirePlatform(permission: PlatformPermission = "directory") {
  const entry = await platformEntry();
  if (!entry.signedIn) redirect("/platform/sign-in");
  if (!entry.admin || !entry.mfa || !platformCan(entry.admin.role, permission)) throw new AccessError("FORBIDDEN");
  return entry.admin;
}
