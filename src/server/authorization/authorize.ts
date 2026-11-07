import "server-only";
import type { Prisma } from "@prisma/client";
import { requireCommercialAccess } from "../commercial/access";
import { prisma } from "../db/prisma";
import { getCurrentWorkspaceMembership } from "../auth/get-current-workspace";
import { AccessError } from "./errors";
import { can, type Permission } from "./permissions";

export async function requirePermission(permission: Permission) {
  const member = await getCurrentWorkspaceMembership();
  if (!can(member.role, permission)) throw new AccessError("FORBIDDEN");
  await requireCommercialAccess(member.workspaceId, false, prisma, commercialFeature(permission));
  return member;
}

// All membership/assignment/business mutations serialize on the workspace row.
// Recheck active membership after the lock, never trust a role from the client.
export async function workspaceMutation<T>(permission: Permission | null, operation: (tx: Prisma.TransactionClient, member: Awaited<ReturnType<typeof getCurrentWorkspaceMembership>>) => Promise<T>) {
  const context = await getCurrentWorkspaceMembership();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${context.workspaceId} FOR UPDATE`;
    const member = await tx.workspaceMember.findFirst({ where: { id: context.id, userId: context.userId, workspaceId: context.workspaceId, status: "ACTIVE" }, include: { user: true, workspace: true } });
    if (!member || (permission && !can(member.role, permission))) throw new AccessError("FORBIDDEN");
    await requireCommercialAccess(member.workspaceId, true, tx, permission ? commercialFeature(permission) : "tasks");
    return operation(tx, member);
  });
}

export async function audit(tx: Prisma.TransactionClient, member: { userId: string; workspaceId: string }, action: string, resourceType: string, resourceId: string, metadata?: Prisma.InputJsonObject) {
  await tx.auditLog.create({ data: { workspaceId: member.workspaceId, actorUserId: member.userId, action, resourceType, resourceId, metadata } });
}

function commercialFeature(permission: Permission) { const name = permission.split(":")[0]; return ["clients", "projects", "tasks", "invoices"].includes(name) ? name : undefined; }
