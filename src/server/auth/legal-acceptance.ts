import "server-only";
import { stagingRequested } from "../staging/config";
import { pay1Enabled } from "../preview/pay1-config";
import { requestRoutingContext } from "../routing/request-context";
import { centralUrl } from "@/lib/routing/host-policy";
import { authReturnForPath, safeAuthReturn } from "@/lib/routing/navigation";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getAuthConfiguration } from "@/config/auth";
import { requireClerkIdentity } from "./clerk-identity";
import { IdentityError } from "./identity-error";

import { requireLegalRehearsal } from "../legal/config";
import { hasCurrentSyntheticLegalReceipt } from "../legal/acceptance";

export async function requireCurrentLegalReceipt(userId: string) {
  if (stagingRequested()) {
    const { hasStagingAcknowledgment } = await import("../staging/acknowledgment");
    if (!await hasStagingAcknowledgment(userId)) redirect("/account/staging-terms");
    return;
  }
  if (pay1Enabled()) {
    const { requirePay1Actor } = await import("../preview/pay1-admission");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { externalId: true } });
    if (!user?.externalId) throw new IdentityError("ACCOUNT_UNAVAILABLE");
    await requirePay1Actor(user.externalId);
    return; // Explicit synthetic testing exception; no legal receipt is created.
  }
  if (process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED === "true") {
    requireLegalRehearsal();
    if (!await hasCurrentSyntheticLegalReceipt(userId)) {
      const { policy } = await requestRoutingContext();
      redirect(centralUrl(policy, "/account/legal/rehearsal"));
    }
    return;
  }
  const config = getAuthConfiguration();
  // No receipt query or consent prompt for unapproved drafts.
  if (!config.requireLegal || !config.legalReady) return;
  const receipt = await prisma.legalAcceptance.findUnique({ where: { userId_termsVersion_privacyVersion: { userId, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion } }, select: { id: true } });
  if (!receipt) {
    const { policy, requestHeaders } = await requestRoutingContext();
    const intent = safeAuthReturn(requestHeaders.get("x-coreops-return-to") ?? authReturnForPath(requestHeaders.get("x-coreops-path") ?? "/dashboard"));
    redirect(centralUrl(policy, `/account/legal?${new URLSearchParams({ returnTo: intent })}`));
  }
}

export async function recordLegalAcceptance(accepted: boolean, expected: { termsVersion: string; privacyVersion: string }) {
  if (stagingRequested() || pay1Enabled() || process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED === "true") throw new IdentityError("LEGAL_ACCEPTANCE_REQUIRED");
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
