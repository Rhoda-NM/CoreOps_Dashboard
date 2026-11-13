import "server-only";
import { prisma } from "../db/prisma";
import { requirePlatform } from "../commercial/platform-auth";
import { AccessError } from "../authorization/errors";
import { requireStagingEnvironment } from "./environment";
import { z } from "zod";

export async function stagingUsers() {
  await requirePlatform("activate");
  await requireStagingEnvironment();
  return prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, name: true, email: true, platformSuspended: true, platformAdmin: { select: { role: true } }, _count: { select: { memberships: true } } } });
}

export async function setStagingUserSuspended(userId: string, suspended: boolean, reason: string) {
  const actor = await requirePlatform("activate");
  z.string().min(1).max(100).parse(userId);
  z.boolean().parse(suspended);
  const approvedReason = z.string().trim().min(10).max(1000).parse(reason);
  return prisma.$transaction(async tx => {
    await requireStagingEnvironment(tx);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const target = await tx.user.findUnique({ where: { id: userId }, include: { platformAdmin: true } });
    if (!target || target.id === actor.userId || target.platformAdmin) throw new AccessError("FORBIDDEN");
    // Serialize with every business/financial writer before changing the flag.
    // Membership writers lock these same workspaces. Account-wide admin roles
    // are deliberately outside this customer suspension operation.
    const memberships = await tx.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true }, orderBy: { workspaceId: "asc" }, take: 1001 });
    if (memberships.length > 1000) throw new AccessError("FORBIDDEN");
    for (const { workspaceId } of memberships) await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${actor.id} FOR UPDATE`;
    if (!await tx.platformAdmin.findFirst({ where: { id: actor.id, userId: actor.userId, active: true, role: "SUPER_ADMIN" } })) throw new AccessError("FORBIDDEN");
    if (target.platformSuspended === suspended) return;
    await tx.user.update({ where: { id: userId }, data: { platformSuspended: suspended } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: actor.id, action: suspended ? "STAGING_USER_SUSPENDED" : "STAGING_USER_RESTORED", resourceType: "User", resourceId: userId, reason: approvedReason } });
  });
}
