import "server-only";
import { prisma } from "../db/prisma";
import { AccessError } from "../authorization/errors";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { requireCentralHost } from "../routing/request-context";
import { requireLegalRehearsal } from "./config";
import { currentLegalPublication, legalNow, lockLegalControl, publicationInclude, reconstructPublication, type LegalTX } from "./catalog";
async function acceptingUser(tx: LegalTX, externalId: string) {
  const user = await tx.user.findUnique({ where: { externalId }, select: { id: true, externalId: true } });
  if (!user) throw new AccessError("FORBIDDEN");
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
  if (!await tx.user.count({ where: { id: user.id, externalId } })) throw new AccessError("FORBIDDEN");
  return user;
}
export async function presentSyntheticLegalSet() {
  requireLegalRehearsal(); await requireCentralHost(); const profile = await requireClerkIdentity();
  return prisma.$transaction(async tx => {
    const user = await acceptingUser(tx, profile.id); await lockLegalControl(tx);
    const current = await currentLegalPublication(tx), now = await legalNow(tx);
    const subject = await tx.legalEvidenceSubject.findUnique({ where: { userId: user.id } }) ?? await tx.legalEvidenceSubject.create({ data: { userId: user.id } });
    if (await tx.legalPresentation.count({ where: { subjectId: subject.id, presentedAt: { gt: new Date(+now - 3600000) } } }) >= 20) throw new AccessError("FORBIDDEN");
    const presentation = await tx.legalPresentation.create({ data: { subjectId: subject.id, publicationId: current.publication.id, controlRevision: current.control.revision, presentedAt: now, expiresAt: new Date(+now + 5 * 60000) } });
    return { presentationId: presentation.id, publicationId: current.publication.id, manifestHash: current.publication.manifestHash, version: current.publication.version, termsVersion: current.publication.terms.version, privacyVersion: current.publication.privacy.version, termsText: current.termsText, privacyText: current.privacyText };
  });
}
export async function acceptSyntheticLegalSet(input: { presentationId: string; publicationId: string; manifestHash: string; agreeTerms: boolean; acknowledgePrivacy: boolean }) {
  requireLegalRehearsal(); await requireCentralHost(); const profile = await requireClerkIdentity();
  if (input.agreeTerms !== true || input.acknowledgePrivacy !== true) throw new AccessError("FORBIDDEN");
  return prisma.$transaction(async tx => {
    const user = await acceptingUser(tx, profile.id); await lockLegalControl(tx);
    const current = await currentLegalPublication(tx), now = await legalNow(tx);
    const subject = await tx.legalEvidenceSubject.findUniqueOrThrow({ where: { userId: user.id } });
    const presentation = await tx.legalPresentation.findFirstOrThrow({ where: { id: input.presentationId, subjectId: subject.id, publicationId: input.publicationId } });
    if (current.publication.id !== input.publicationId || current.publication.manifestHash !== input.manifestHash || current.control.revision !== presentation.controlRevision || subject.detachedAt) throw new AccessError("CONFLICT");
    const prior = await tx.legalAcceptanceEvidence.findUnique({ where: { subjectId_publicationId: { subjectId: subject.id, publicationId: input.publicationId } } });
    if (prior) return { id: prior.id, acceptedAt: prior.acceptedAt, source: prior.source };
    if (presentation.expiresAt <= now || presentation.presentedAt > now) throw new AccessError("FORBIDDEN");
    const receipt = await tx.legalAcceptanceEvidence.create({ data: { subjectId: subject.id, publicationId: input.publicationId, presentationId: presentation.id, termsAgreement: true, privacyAcknowledgment: true, acceptedAt: now } });
    await tx.legalEvidenceEvent.create({ data: { type: "TERMS_AGREED_PRIVACY_ACKNOWLEDGED", subjectId: subject.id, publicationId: receipt.publicationId, receiptId: receipt.id, operationKey: `${receipt.id}:ACCEPTED`, recordedAt: now } });
    return { id: receipt.id, acceptedAt: receipt.acceptedAt, source: receipt.source };
  });
}
export async function hasCurrentSyntheticLegalReceipt(userId: string) {
  requireLegalRehearsal();
  return prisma.$transaction(async tx => {
    await lockLegalControl(tx); const current = await currentLegalPublication(tx);
    return !!await tx.legalAcceptanceEvidence.findFirst({ where: { publicationId: current.publication.id, subject: { userId, detachedAt: null } }, select: { id: true } });
  });
}
export async function ownSyntheticLegalReceipt(id: string) {
  requireLegalRehearsal(); await requireCentralHost(); const profile = await requireClerkIdentity();
  const user = await prisma.user.findUniqueOrThrow({ where: { externalId: profile.id }, select: { id: true } });
  const receipt = await prisma.legalAcceptanceEvidence.findFirstOrThrow({ where: { id, subject: { userId: user.id, detachedAt: null } }, include: { publication: { include: publicationInclude } } });
  return { id: receipt.id, acceptedAt: receipt.acceptedAt, publicationId: receipt.publicationId, ...reconstructPublication(receipt.publication) };
}
export async function ownHistoricalLegalReceipts() {
  requireLegalRehearsal(); await requireCentralHost(); const profile = await requireClerkIdentity();
  const user = await prisma.user.findUniqueOrThrow({ where: { externalId: profile.id }, select: { id: true } });
  const rows = await prisma.legalAcceptance.findMany({ where: { userId: user.id }, orderBy: { acceptedAt: "desc" }, take: 50, select: { id: true, termsVersion: true, privacyVersion: true, termsUrl: true, privacyUrl: true, acceptedAt: true, source: true } });
  return rows.map(row => ({ ...row, evidenceClass: "LABEL_URL_ONLY" as const, reconstructableFromReceipt: false as const }));
}
