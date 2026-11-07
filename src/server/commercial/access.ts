import "server-only";
import { prisma } from "../db/prisma";
import type { Prisma } from "@prisma/client";
import { CommercialError } from "./policy";
type DB = Prisma.TransactionClient;
export async function commercialAccess(workspaceId: string, db: DB = prisma, now = new Date()) {
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { activationStatus: true, subscription: { select: { status: true } } } });
  const period = await db.subscriptionPeriod.findFirst({ where: { workspaceId, revokedAt: null, startsAt: { lte: now } }, orderBy: { endsAt: "desc" } });
  const enabled = workspace.activationStatus === "ACTIVE" && !!workspace.subscription && !["PENDING_ACTIVATION", "TRIALING", "SUSPENDED"].includes(workspace.subscription.status) && !!period;
  return { workspace, period, read: enabled, write: enabled && period.graceEndsAt > now, inGrace: enabled && period.endsAt <= now && period.graceEndsAt > now };
}
export async function requireCommercialAccess(workspaceId: string, write = false, db: DB = prisma, feature?: string) {
  const access = await commercialAccess(workspaceId, db);
  if (!(write ? access.write : access.read)) throw new CommercialError(write && access.read ? "Your paid period and grace period have ended. Business data is read-only; request a renewal from Subscription." : "Workspace operations are unavailable. Open Subscription to review activation or contact support.");
  if (feature && (!access.period?.features || typeof access.period.features !== "object" || Array.isArray(access.period.features) || access.period.features[feature] !== true)) throw new CommercialError("Your subscription does not include this feature.");
  return access.period!;
}
// Suspended memberships retain seats. Only removal releases their capacity.
export async function capacity(workspaceId: string, db: DB, excludingInvitation?: string) {
  const members = await db.workspaceMember.count({ where: { workspaceId } });
  const reserved = await db.workspaceInvitation.count({ where: { workspaceId, status: "PENDING", expiresAt: { gt: new Date() }, ...(excludingInvitation ? { id: { not: excludingInvitation } } : {}) } });
  return members + reserved;
}
export async function requireInvitationCapacity(workspaceId: string, db: DB, excludingInvitation?: string, additional = 1) {
  const period = await requireCommercialAccess(workspaceId, true, db);
  if (!period.invitationsEnabled || period.plan === "SOLO") throw new CommercialError("This plan does not allow invitations. Request an eligible plan upgrade from Subscription.");
  if (await capacity(workspaceId, db, excludingInvitation) + additional > period.memberLimit) throw new CommercialError("All member seats are in use or reserved by invitations. Revoke an invitation, remove a member, or request an upgrade.");
}
