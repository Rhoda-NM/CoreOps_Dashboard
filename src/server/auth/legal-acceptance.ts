import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getAuthConfiguration } from "@/config/auth";
import { requireClerkIdentity } from "./clerk-identity";
import { IdentityError } from "./identity-error";

export async function requireCurrentLegalReceipt(userId: string) {
  const config = getAuthConfiguration();
  // No receipt query or consent prompt for unapproved drafts.
  if (!config.requireLegal || !config.legalReady) return;
  const receipt = await prisma.legalAcceptance.findUnique({ where: { userId_termsVersion_privacyVersion: { userId, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion } }, select: { id: true } });
  if (!receipt) redirect("/account/legal");
}

export async function recordLegalAcceptance(accepted: boolean, expected: { termsVersion: string; privacyVersion: string }) {
  const config = getAuthConfiguration();
  if (!config.legalReady || accepted !== true || expected.termsVersion !== config.termsVersion || expected.privacyVersion !== config.privacyVersion) throw new IdentityError("LEGAL_ACCEPTANCE_REQUIRED");
  const profile = await requireClerkIdentity();
  // Never provision/link through the acceptance endpoint or trust a posted ID.
  const user = await prisma.user.findUnique({ where: { externalId: profile.id }, select: { id: true } });
  if (!user) throw new IdentityError("ACCOUNT_UNAVAILABLE");
  return prisma.$transaction(async transaction => {
    // Compound Prisma upserts may race at the client layer. Serialize explicit
    // acknowledgements per user so retries retain the first acceptance time.
    await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    return transaction.legalAcceptance.upsert({
      where: { userId_termsVersion_privacyVersion: { userId: user.id, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion } },
      update: {},
      create: { userId: user.id, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion, termsUrl: config.termsUrl!, privacyUrl: config.privacyUrl!, acceptedAt: new Date(), source: "COREOPS_EXPLICIT", clerkLegalAcceptedAt: profile.legalAcceptedAt ? new Date(profile.legalAcceptedAt) : null },
      select: { termsVersion: true, privacyVersion: true, acceptedAt: true, source: true },
    });
  });
}
