import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AccessError } from "../authorization/errors";
import { requirePlatform } from "../commercial/platform-auth";
import { lifecycleNow } from "../lifecycle/clock";
import { resolveLifecycle } from "../lifecycle/service";
import { dataEvent } from "./events";
import { hash, requireDataAccess, sensitiveIdentity } from "./security";
const bounded = z.string().trim().min(3).max(500);

export async function requestRecovery(workspaceId: string, claimReference: string, idempotencyKey: string) {
  const actor = await sensitiveIdentity(); bounded.parse(claimReference); z.string().min(16).max(100).parse(idempotencyKey);
  z.string().min(1).max(100).parse(workspaceId);
  const payloadHash = hash(JSON.stringify({ workspaceId, claimReference }));
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    const now = await lifecycleNow(tx);
    const existing = await tx.workspaceRecoveryRequest.findUnique({ where: { requesterId_idempotencyKey: { requesterId: actor.user.id, idempotencyKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new AccessError("CONFLICT"); return { id: existing.id, status: existing.status }; }
    // Bounded abuse surface, even for an authenticated non-member claimant.
    if (await tx.workspaceRecoveryRequest.count({ where: { requesterId: actor.user.id, createdAt: { gt: new Date(+now - 3600000) } } }) >= 5) throw new AccessError("FORBIDDEN");
    const life = await resolveLifecycle(workspaceId, tx, now);
    if (!life.period || life.retentionExpired) throw new AccessError("FORBIDDEN");
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.user.id } });
    if (user.externalId !== actor.externalId || hash(user.email.toLowerCase()) !== actor.emailHash) throw new AccessError("FORBIDDEN");
    const row = await tx.workspaceRecoveryRequest.create({ data: { workspaceId, requesterId: user.id, requesterExternalId: actor.externalId, emailHash: actor.emailHash, sourcePeriodId: life.journal?.episodeId ?? life.period.id, claimReference, idempotencyKey, payloadHash } });
    await dataEvent(tx, { workspaceId, episodeId: row.sourcePeriodId, type: "RECOVERY_REQUESTED", recoveryId: row.id }, now);
    return { id: row.id, status: row.status };
  });
}

export async function reviewRecovery(id: string, input: { approve: boolean; export: boolean; reactivate: boolean; minutes: number; evidence: string; reason: string; ownershipVerified: boolean }) {
  requireDataAccess(); const admin = await requirePlatform("activate");
  bounded.parse(input.reason); bounded.parse(input.evidence); z.number().int().min(1).max(60).parse(input.minutes);
  if (input.approve && !input.ownershipVerified) throw new AccessError("FORBIDDEN");
  const original = await prisma.workspaceRecoveryRequest.findUniqueOrThrow({ where: { id }, include: { requester: true } });
  if (original.requesterId === admin.userId) throw new AccessError("FORBIDDEN");
  // Independent live provider check; written evidence never replaces identity verification.
  if (input.approve) {
    const profile = await (await clerkClient()).users.getUser(original.requesterExternalId);
    const email = profile.emailAddresses.find(e => e.id === profile.primaryEmailAddressId);
    if (profile.id !== original.requesterExternalId || profile.banned || profile.locked || email?.verification?.status !== "verified" || hash(email.emailAddress.trim().toLowerCase()) !== original.emailHash) throw new AccessError("FORBIDDEN");
  }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${original.workspaceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
    const currentAdmin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!currentAdmin.active || currentAdmin.role !== "SUPER_ADMIN") throw new AccessError("FORBIDDEN");
    const now = await lifecycleNow(tx), row = await tx.workspaceRecoveryRequest.findUniqueOrThrow({ where: { id }, include: { requester: true } });
    if (row.status !== "PENDING" || (input.approve && (row.requester.externalId !== row.requesterExternalId || hash(row.requester.email.toLowerCase()) !== row.emailHash))) throw new AccessError("CONFLICT");
    const life = await resolveLifecycle(row.workspaceId, tx, now);
    if (input.approve && (!life.period || life.retentionExpired || row.sourcePeriodId !== (life.journal?.episodeId ?? life.period.id) || (!input.export && !input.reactivate))) throw new AccessError("FORBIDDEN");
    const result = await tx.workspaceRecoveryRequest.update({ where: { id }, data: { status: input.approve ? "APPROVED" : "REJECTED", allowExport: input.approve && input.export, allowReactivation: input.approve && input.reactivate, expiresAt: input.approve ? new Date(+now + input.minutes * 60000) : null, reviewedById: admin.id, reviewedAt: now, identityCheckedAt: input.approve ? now : null, ownershipVerifiedAt: input.approve ? now : null, evidenceReferences: input.evidence, reviewReason: input.reason } });
    await dataEvent(tx, { workspaceId: row.workspaceId, episodeId: row.sourcePeriodId, recoveryId: id, type: input.approve ? "RECOVERY_APPROVED" : "RECOVERY_REJECTED" }, now);
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, workspaceId: row.workspaceId, action: "RECOVERY_REVIEWED", resourceType: "WorkspaceRecoveryRequest", resourceId: id, reason: input.reason, metadata: { approved: input.approve } } });
    return { id: result.id, status: result.status };
  });
}

export async function revokeRecovery(id: string, reason: string) {
  requireDataAccess(); bounded.parse(reason); const admin = await requirePlatform("activate");
  const initial = await prisma.workspaceRecoveryRequest.findUniqueOrThrow({ where: { id } });
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${initial.workspaceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
    const currentAdmin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!currentAdmin.active || currentAdmin.role !== "SUPER_ADMIN") throw new AccessError("FORBIDDEN");
    const row = await tx.workspaceRecoveryRequest.findUniqueOrThrow({ where: { id } }), now = await lifecycleNow(tx);
    if (row.status === "REVOKED") return;
    if (row.status !== "APPROVED") throw new AccessError("CONFLICT");
    await tx.workspaceRecoveryRequest.update({ where: { id }, data: { status: "REVOKED", revokedAt: now, revocationReason: reason } });
    // A revoked grant's encrypted artifacts are no longer useful or downloadable.
    await tx.workspaceExportRequest.updateMany({ where: { recoveryId: id, status: { in: ["REQUESTED", "PROCESSING", "READY"] } }, data: { status: "EXPIRED", artifact: null, tokenHash: null } });
    await dataEvent(tx, { workspaceId: row.workspaceId, episodeId: row.sourcePeriodId, recoveryId: id, type: "RECOVERY_REVOKED" }, now);
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, workspaceId: row.workspaceId, action: "RECOVERY_REVOKED", resourceType: "WorkspaceRecoveryRequest", resourceId: id, reason } });
  });
}

export async function recoveryQueue() {
  requireDataAccess(); await requirePlatform("activate");
  return prisma.workspaceRecoveryRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, workspaceId: true, requesterId: true, requesterExternalId: true, claimReference: true, status: true, sourcePeriodId: true, createdAt: true, expiresAt: true, allowExport: true, allowReactivation: true, reviewedById: true, evidenceReferences: true, reviewReason: true } });
}
