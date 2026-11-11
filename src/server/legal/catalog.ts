import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type LegalDocumentKind } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { requirePlatform } from "../commercial/platform-auth";
import { AccessError } from "../authorization/errors";
import { requireLegalRehearsal } from "./config";
import { canonicalLegalText, legalHash, reconstructLegalVersion } from "./content";
export type LegalTX = Prisma.TransactionClient;
export async function legalNow(tx: LegalTX) { return (await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`)[0].now; }
export async function lockLegalControl(tx: LegalTX) {
  await tx.$queryRaw`SELECT id FROM "LegalPublicationControl" WHERE id='REHEARSAL' FOR UPDATE`;
  return tx.legalPublicationControl.findUniqueOrThrow({ where: { id: "REHEARSAL" } });
}
async function legalAdmin<T>(fn: (tx: LegalTX, adminId: string) => Promise<T>) {
  requireLegalRehearsal(); const actor = await requirePlatform("activate"); const identity = await requireClerkIdentity();
  return prisma.$transaction(async tx => {
    await lockLegalControl(tx);
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${actor.id} FOR UPDATE`;
    const fresh = await tx.platformAdmin.findUniqueOrThrow({ where: { id: actor.id } });
    if (!fresh.active || fresh.role !== "SUPER_ADMIN" || fresh.userId !== actor.userId || !await tx.user.count({ where: { id: fresh.userId, externalId: identity.id } })) throw new AccessError("FORBIDDEN");
    return fn(tx, fresh.id);
  });
}
export async function createSyntheticLegalVersion(input: { kind: LegalDocumentKind; version: string; language: string; content: Uint8Array }) {
  const kind = z.enum(["TERMS", "PRIVACY", "CUSTOMER_DPA", "COOKIE_NOTICE", "RETENTION_SCHEDULE"]).parse(input.kind);
  z.string().regex(/^[A-Z0-9-]{3,80}$/).parse(input.version); z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).max(35).parse(input.language);
  const text = canonicalLegalText(input.content);
  if (!text.startsWith("SYNTHETIC TEST")) throw new AccessError("FORBIDDEN");
  return legalAdmin(async (tx, adminId) => tx.legalDocumentVersion.create({ data: { kind, version: input.version, language: input.language, content: Buffer.from(input.content), contentHash: legalHash(input.content), byteLength: input.content.byteLength, createdById: adminId, createdAt: await legalNow(tx) } }));
}
export async function reviewSyntheticLegalVersion(versionId: string, evidenceReference: string, reason: string) {
  z.string().startsWith("SYNTHETIC:").min(12).max(300).parse(evidenceReference); z.string().trim().min(10).max(1000).parse(reason);
  return legalAdmin(async (tx, adminId) => {
    const version = await tx.legalDocumentVersion.findUniqueOrThrow({ where: { id: versionId } }); reconstructLegalVersion(version);
    if (await tx.legalVersionReview.count({ where: { versionId, action: "WITHDRAW" } })) throw new AccessError("FORBIDDEN");
    return tx.legalVersionReview.create({ data: { versionId, action: "SIMULATED_APPROVE", reviewerId: adminId, evidenceReference, reason, recordedAt: await legalNow(tx) } });
  });
}
export const publicationInclude = { terms: true, privacy: true, termsReview: true, privacyReview: true } as const;
type Publication = Prisma.LegalPublicationGetPayload<{ include: typeof publicationInclude }>;
function manifestFor(row: Omit<Publication, "manifest" | "manifestHash"> | Publication) {
  const descriptor = (v: Publication["terms"]) => ({ id: v.id, kind: v.kind, version: v.version, language: v.language, format: v.format, rendererVersion: v.rendererVersion, hashAlgorithm: v.hashAlgorithm, contentHash: v.contentHash, byteLength: v.byteLength });
  return Buffer.from(JSON.stringify({ schema: "LEGAL-SET-v1", id: row.id, version: row.version, terms: descriptor(row.terms), privacy: descriptor(row.privacy), termsReviewId: row.termsReviewId, privacyReviewId: row.privacyReviewId, publishedAt: row.publishedAt.toISOString(), effectiveAt: row.effectiveAt.toISOString(), semantics: { terms: "AGREEMENT", privacy: "ACKNOWLEDGMENT", optionalConsent: false, customerDpaExecuted: false }, synthetic: true }), "utf8");
}
export function reconstructPublication(row: Publication) {
  const termsText = reconstructLegalVersion(row.terms), privacyText = reconstructLegalVersion(row.privacy);
  if (row.terms.kind !== "TERMS" || row.privacy.kind !== "PRIVACY" || row.terms.language !== row.privacy.language || !row.synthetic || !manifestFor(row).equals(Buffer.from(row.manifest)) || legalHash(row.manifest) !== row.manifestHash || row.termsReview.versionId !== row.termsId || row.privacyReview.versionId !== row.privacyId || row.termsReview.action !== "SIMULATED_APPROVE" || row.privacyReview.action !== "SIMULATED_APPROVE") throw new Error("LEGAL_CONTENT_INVALID");
  return { termsText, privacyText };
}
export async function currentLegalPublication(tx: LegalTX) {
  const control = await tx.legalPublicationControl.findUniqueOrThrow({ where: { id: "REHEARSAL" } });
  if (!control.publicationId) throw new AccessError("FORBIDDEN");
  const publication = await tx.legalPublication.findUniqueOrThrow({ where: { id: control.publicationId }, include: publicationInclude });
  if (publication.effectiveAt > await legalNow(tx) || await tx.legalVersionReview.count({ where: { versionId: { in: [publication.termsId, publication.privacyId] }, action: "WITHDRAW" } })) throw new AccessError("FORBIDDEN");
  return { control, publication, ...reconstructPublication(publication) };
}
export async function publishSyntheticLegalSet(version: string, termsId: string, privacyId: string) {
  z.string().regex(/^[A-Z0-9-]{3,80}$/).parse(version);
  return legalAdmin(async (tx, adminId) => {
    const control = await tx.legalPublicationControl.findUniqueOrThrow({ where: { id: "REHEARSAL" } });
    const terms = await tx.legalDocumentVersion.findUniqueOrThrow({ where: { id: termsId } }), privacy = await tx.legalDocumentVersion.findUniqueOrThrow({ where: { id: privacyId } });
    if (terms.kind !== "TERMS" || privacy.kind !== "PRIVACY" || terms.language !== privacy.language) throw new AccessError("FORBIDDEN");
    reconstructLegalVersion(terms); reconstructLegalVersion(privacy);
    if (await tx.legalVersionReview.count({ where: { versionId: { in: [termsId, privacyId] }, action: "WITHDRAW" } })) throw new AccessError("FORBIDDEN");
    const termsReview = await tx.legalVersionReview.findUniqueOrThrow({ where: { versionId_action: { versionId: termsId, action: "SIMULATED_APPROVE" } } }), privacyReview = await tx.legalVersionReview.findUniqueOrThrow({ where: { versionId_action: { versionId: privacyId, action: "SIMULATED_APPROVE" } } });
    const now = await legalNow(tx), id = randomUUID();
    const snapshot = { id, version, termsId, privacyId, termsReviewId: termsReview.id, privacyReviewId: privacyReview.id, publishedAt: now, effectiveAt: now, publisherId: adminId, synthetic: true, terms, privacy, termsReview, privacyReview };
    const manifest = manifestFor(snapshot);
    const published = await tx.legalPublication.create({ data: { id, version, termsId, privacyId, termsReviewId: termsReview.id, privacyReviewId: privacyReview.id, manifest, manifestHash: legalHash(manifest), publishedAt: now, effectiveAt: now, publisherId: adminId } });
    if (control.publicationId) await tx.legalEvidenceEvent.create({ data: { type: "SUPERSEDED", publicationId: control.publicationId, actorAdminId: adminId, operationKey: `${id}:SUPERSEDES:${control.publicationId}`, recordedAt: now } });
    await tx.legalEvidenceEvent.create({ data: { type: "PUBLISHED", publicationId: id, actorAdminId: adminId, operationKey: `${id}:PUBLISHED`, recordedAt: now } });
    await tx.legalPublicationControl.update({ where: { id: control.id }, data: { publicationId: id, revision: { increment: 1 } } });
    return published;
  });
}
export async function withdrawSyntheticLegalVersion(versionId: string, evidenceReference: string, reason: string) {
  z.string().startsWith("SYNTHETIC:").min(12).max(300).parse(evidenceReference); z.string().trim().min(10).max(1000).parse(reason);
  return legalAdmin(async (tx, adminId) => {
    await tx.legalVersionReview.create({ data: { versionId, action: "WITHDRAW", reviewerId: adminId, evidenceReference, reason, recordedAt: await legalNow(tx) } });
    const control = await tx.legalPublicationControl.findUniqueOrThrow({ where: { id: "REHEARSAL" }, include: { publication: true } });
    if (control.publication && [control.publication.termsId, control.publication.privacyId].includes(versionId)) {
      await tx.legalEvidenceEvent.create({ data: { type: "WITHDRAWN", publicationId: control.publication.id, actorAdminId: adminId, operationKey: `${control.publication.id}:WITHDRAWN`, recordedAt: await legalNow(tx) } });
      await tx.legalPublicationControl.update({ where: { id: control.id }, data: { publicationId: null, revision: { increment: 1 } } });
    }
  });
}
