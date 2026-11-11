import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { requireCentralHost } from "@/server/routing/request-context";
import { generateWorkspaceSlug, selectedWorkspaceSlugMessage } from "@/lib/routing/workspace-slug";
import { z } from "zod";
import { requireApplicationEligibility } from "../market/access";
import { requireMarketRehearsal } from "../market/config";
import { AccessError } from "../authorization/errors";

export const workspaceNameSchema = z.string().trim().min(2, "Workspace name is required.").max(120, "Use no more than 120 characters.");
function isSlugCollision(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;
  const meta = "meta" in error ? error.meta as Record<string, unknown> | undefined : undefined;
  if (meta?.modelName && meta.modelName !== "Workspace") return false;
  // Prisma 7's pg adapter carries the violated fields in the adapter cause
  // rather than always populating the older meta.target shape.
  const adapter = meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined;
  const target = meta?.target ?? adapter?.cause?.constraint?.fields;
  if (Array.isArray(target)) return target.length === 1 && target[0] === "slug";
  return target === "Workspace_slug_key";
}
export class WorkspaceAddressUnavailable extends Error {
  constructor() { super("This workspace address is unavailable. Please choose another."); }
}
export async function createInitialWorkspace(name: unknown, selectedSlug?: unknown, applicationId?: string) {
  await requireCentralHost();
  requireMarketRehearsal();
  if (selectedSlug !== undefined) {
    const problem = selectedWorkspaceSlugMessage(selectedSlug);
    if (problem) throw new Error(problem);
  }
  const validName = workspaceNameSchema.parse(name);
  const user = await getCurrentUser();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = selectedSlug === undefined ? generateWorkspaceSlug(validName, randomUUID().slice(0, 8)) : selectedSlug as string;
    try {
      // Retry the entire transaction: a unique violation aborts a PostgreSQL
      // transaction, so retrying only workspace.create inside it is unsafe.
      return await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const identity = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { externalId: true, email: true } });
        if (identity.externalId !== user.externalId || identity.email !== user.email) throw new AccessError("FORBIDDEN");
        if (!applicationId) throw new AccessError("FORBIDDEN");
        await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${applicationId} FOR UPDATE`;
        const application = await requireApplicationEligibility(tx, applicationId);
        if (application.applicantUserId !== user.id) throw new AccessError("FORBIDDEN");
        const previous = await tx.workspace.findUnique({ where: { marketApplicationId: applicationId } });
        if (previous) return previous;
        const existing = await tx.workspaceMember.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
        if (existing) throw new AccessError("CONFLICT");
        const workspace = await tx.workspace.create({ data: {
          name: validName, slug, marketApplicationId: applicationId, activationStatus: "PENDING_ACTIVATION",
          subscription: { create: { status: "PENDING_ACTIVATION" } },
        } });
        await tx.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" } });
        await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "WORKSPACE_CREATED", resourceType: "Workspace", resourceId: workspace.id, metadata: { marketApplicationId: application.id, marketDecisionId: application.currentDecisionId, marketSubmissionId: application.operativeSubmissionId } } });
        return workspace;
      });
    } catch (error) {
      if (!isSlugCollision(error)) throw error;
      if (selectedSlug !== undefined) throw new WorkspaceAddressUnavailable();
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Unable to allocate workspace address.");
}
