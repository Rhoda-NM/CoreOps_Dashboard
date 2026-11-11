import "server-only";
import type { Prisma, WorkspaceLifecycleEventType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { CommercialError } from "../commercial/policy";
import { lifecycleEnforcementEnabled } from "./config";
import { lifecycleNow } from "./clock";
import { calculateLifecycle, LIFECYCLE_POLICY_VERSION } from "./policy";
import { recoveryGrant } from "../data-access/grants";
type TX = Prisma.TransactionClient;

export async function resolveLifecycle(workspaceId: string, db: TX = prisma, now = new Date()) {
  // Future activated renewals take effect at their start; the current period's
  // entitlements are never replaced early by a future upgraded period.
  const period = await db.subscriptionPeriod.findFirst({ where: { workspaceId, revokedAt: null, startsAt: { lte: now } }, orderBy: { endsAt: "desc" } });
  const journal = await db.workspaceLifecycle.findUnique({ where: { workspaceId } });
  const calculated = calculateLifecycle(period?.endsAt ?? null, now);
  // A materialized cancellation is sticky until reviewed recovery exists in C.
  return { ...calculated, ...(journal?.cancellationEffectiveAt ? { state: "CANCELED" as const, cancellationAt: journal.cancellationEffectiveAt, retentionEndsAt: journal.retentionEndsAt, retentionExpired: !journal.retentionEndsAt || now >= journal.retentionEndsAt } : {}), period, journal };
}

export async function requireRenewableLifecycle(tx: TX, workspaceId: string, now: Date, recovery?: { requestId: string; ownerMemberId: string }) {
  if (!lifecycleEnforcementEnabled()) return null;
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, include: { subscription: true } });
  const lifecycle = await resolveLifecycle(workspaceId, tx, now);
  if (lifecycle.state === "CANCELED" || workspace.subscription?.status === "CANCELED") {
    if (!recovery || !lifecycle.period || lifecycle.retentionExpired) throw new CommercialError("This workspace requires a separately reviewed recovery before activation. Contact support.");
    const owner = await tx.workspaceMember.findFirstOrThrow({ where: { id: recovery.ownerMemberId, workspaceId, role: "OWNER", status: "ACTIVE" } });
    return recoveryGrant(tx, workspaceId, recovery.requestId, owner.userId, lifecycle.journal?.episodeId ?? lifecycle.period.id, "reactivate", now);
  }
  return null;
}

async function event(tx: TX, workspaceId: string, episodeId: string, type: WorkspaceLifecycleEventType, effectiveAt: Date, recordedAt: Date) {
  const operationKey = `${episodeId}:${type}`;
  const persisted = await tx.workspaceLifecycleEvent.upsert({ where: { operationKey }, update: {}, create: { workspaceId, episodeId, type, effectiveAt, recordedAt, policyVersion: LIFECYCLE_POLICY_VERSION, operationKey } });
  if (persisted.workspaceId !== workspaceId || persisted.episodeId !== episodeId || persisted.type !== type || +persisted.effectiveAt !== +effectiveAt || persisted.policyVersion !== LIFECYCLE_POLICY_VERSION) throw new Error("Lifecycle event operation conflict");
}

// Caller owns the Workspace row lock. No public server action accepts these IDs.
export async function synchronizeLifecycle(tx: TX, workspaceId: string, now: Date) {
  if (!lifecycleEnforcementEnabled()) throw new Error("Lifecycle enforcement disabled");
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { activationStatus: true, subscription: { select: { status: true } } } });
  if (workspace.activationStatus !== "ACTIVE" || !workspace.subscription || ["SUSPENDED", "PENDING_ACTIVATION", "TRIALING"].includes(workspace.subscription.status)) return { changed: false };
  const current = await resolveLifecycle(workspaceId, tx, now);
  const { period, journal } = current;
  if (!period || journal?.cancellationEffectiveAt) return { changed: false };
  const episodeId = period.id;
  const archived = current.state === "ARCHIVED" || current.state === "CANCELED";
  const canceled = current.state === "CANCELED";
  const nextEvaluationAt = canceled ? null : archived ? current.cancellationAt : current.archivedAt;
  if (journal?.sourcePeriodId === period.id && !!journal.archivedAt === archived && !!journal.cancellationEffectiveAt === canceled) return { changed: false };
  // A valid renewal may replace an archive episode, but never a cancellation.
  if (journal?.archivedAt && journal.sourcePeriodId !== period.id) {
    await event(tx, workspaceId, journal.episodeId, "WORKSPACE_REACTIVATED", period.startsAt, now);
  }
  if (archived) await event(tx, workspaceId, episodeId, "WORKSPACE_ARCHIVED", current.archivedAt!, now);
  if (canceled) await event(tx, workspaceId, episodeId, "WORKSPACE_CANCELED", current.cancellationAt!, now);
  const data = { sourcePeriodId: period.id, episodeId, policyVersion: LIFECYCLE_POLICY_VERSION, archivedAt: archived ? current.archivedAt : null, cancellationEffectiveAt: canceled ? current.cancellationAt : null, cancellationRecordedAt: canceled ? now : null, retentionEndsAt: canceled ? current.retentionEndsAt : null, nextEvaluationAt };
  await tx.workspaceLifecycle.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: { ...data, revision: { increment: 1 } } });
  if (canceled) await tx.subscription.update({ where: { workspaceId }, data: { status: "CANCELED" } });
  return { changed: true };
}

export async function processWorkspaceLifecycle(workspaceId: string, skipLocked = false) {
  if (!lifecycleEnforcementEnabled()) throw new Error("Lifecycle enforcement disabled");
  return prisma.$transaction(async tx => {
    const rows = skipLocked
      ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE SKIP LOCKED`
      : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    if (!rows.length) return { changed: false };
    return synchronizeLifecycle(tx, workspaceId, await lifecycleNow(tx));
  }, { timeout: 8000 });
}
