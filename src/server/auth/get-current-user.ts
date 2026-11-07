import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { getAuthConfiguration } from "@/config/auth";
import { requireClerkIdentity } from "./clerk-identity";
import { IdentityError } from "./identity-error";
import { requireCurrentLegalReceipt } from "./legal-acceptance";
import { isRegistrationReady } from "./clerk-configuration";

export const getCurrentUser = cache(async () => {
  const profile = await requireClerkIdentity();
  const externalId = profile.id;
  const email = profile.primaryEmailAddress!.emailAddress.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { externalId } });
  // Even legacy differently-cased addresses cannot be claimed by a new identity.
  const emailOwner = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, externalId: true } });
  if (emailOwner && emailOwner.externalId !== externalId) throw new IdentityError("IDENTITY_CONFLICT");
  if (!existing && getAuthConfiguration().requireLegal) {
    if (!profile.legalAcceptedAt || !await isRegistrationReady()) throw new IdentityError("LEGAL_ACCEPTANCE_REQUIRED");
  }
  const data = { email, name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null, imageUrl: profile.imageUrl };
  if (existing && existing.email === data.email && existing.name === data.name && existing.imageUrl === data.imageUrl) {
    await requireCurrentLegalReceipt(existing.id);
    return existing;
  }
  try {
    const user = await prisma.$transaction(async transaction => {
      const user = await transaction.user.upsert({ where: { externalId }, update: data, create: { externalId, ...data } });
      if (existing && existing.email !== data.email) {
        const memberships = await transaction.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } });
        if (memberships.length) await transaction.auditLog.createMany({ data: memberships.map(member => ({ workspaceId: member.workspaceId, actorUserId: user.id, action: "IDENTITY_EMAIL_UPDATED", resourceType: "User", resourceId: user.id, metadata: { verified: true } })) });
      }
      return user;
    });
    await requireCurrentLegalReceipt(user.id);
    return user;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const raced = await prisma.user.findUnique({ where: { externalId } });
      if (!existing && raced && raced.email.toLowerCase() === email) {
        await requireCurrentLegalReceipt(raced.id);
        return raced;
      }
      throw new IdentityError("IDENTITY_CONFLICT");
    }
    throw error;
  }
});
