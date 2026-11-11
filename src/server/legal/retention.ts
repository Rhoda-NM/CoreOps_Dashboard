import "server-only";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { requirePlatform } from "../commercial/platform-auth";
import { requireLegalRehearsal } from "./config";
import { AccessError } from "../authorization/errors";
import { legalNow } from "./catalog";
// Synthetic detachment, NOT account deletion or a legal retention determination.
// Legacy evidence and any business/security/market links require separate review.
export async function detachSyntheticLegalSubject(userId: string, retentionReviewReference: string) {
  requireLegalRehearsal(); const admin = await requirePlatform("activate"); const identity = await requireClerkIdentity();
  z.string().startsWith("SYNTHETIC:").min(15).max(300).parse(retentionReviewReference);
  if (admin.userId === userId) throw new AccessError("FORBIDDEN");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
    const fresh = await tx.platformAdmin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!fresh.active || fresh.role !== "SUPER_ADMIN" || fresh.userId !== admin.userId || !await tx.user.count({ where: { id: fresh.userId, externalId: identity.id } })) throw new AccessError("FORBIDDEN");
    const target = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { _count: true, platformAdmin: { select: { id: true } } } });
    if (target.platformAdmin || Object.values(target._count).some(count => count > 0)) throw new AccessError("FORBIDDEN");
    const subject = await tx.legalEvidenceSubject.findUniqueOrThrow({ where: { userId } });
    const now = await legalNow(tx);
    await tx.legalEvidenceSubject.update({ where: { id: subject.id }, data: { userId: null, detachedAt: now, retentionReviewReference } });
    await tx.legalEvidenceEvent.create({ data: { type: "SUBJECT_DETACHED", subjectId: subject.id, actorAdminId: fresh.id, operationKey: `${subject.id}:DETACHED`, recordedAt: now } });
    return { subjectId: subject.id };
  });
}
export function executeCustomerDpa(): never { throw new AccessError("FORBIDDEN"); }
export function disposeLegalEvidence(): never { throw new AccessError("FORBIDDEN"); }
