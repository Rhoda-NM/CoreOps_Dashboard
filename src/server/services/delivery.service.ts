import "server-only";
import { requirePermission } from "../authorization/authorize";
import { projectScope } from "../authorization/policies";
import { requireCommercialAccess } from "../commercial/access";
import { prisma } from "../db/prisma";
import { evaluateDelivery } from "../delivery/evaluate";
import { workspaceNavigationPath } from "../routing/request-context";

export async function getProjectDeliveryCheck(projectId: string, clock: () => Date = () => new Date()) {
  // Enforce access here even when called outside the project page.
  const member = await requirePermission("projects:delivery-check");
  await requireCommercialAccess(member.workspaceId, false, prisma, "tasks");
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectScope(member), workspaceId: member.workspaceId },
    select: {
      id: true, status: true, deadline: true,
      tasks: {
        where: { workspaceId: member.workspaceId, projectId, status: { not: "DONE" }, project: { status: "ACTIVE" } },
        select: { id: true, status: true, dueDate: true, assignedMemberId: true },
      },
    },
  });
  if (!project) return null;
  const href = await workspaceNavigationPath(`/projects/${encodeURIComponent(project.id)}`);
  return evaluateDelivery(project, href, clock);
}
