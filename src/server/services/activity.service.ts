import { prisma } from "../db/prisma";
import { requirePermission } from "../authorization/authorize";
export async function getAuditActivity() {
  const { workspaceId } = await requirePermission("audit:read");
  return prisma.auditLog.findMany({ where: { workspaceId }, select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
}
