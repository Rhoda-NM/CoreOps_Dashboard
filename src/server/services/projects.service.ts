import { requireCommercialAccess } from "../commercial/access";
import { CommercialError } from "../commercial/policy";
import { workspaceMutation, audit } from "../authorization/authorize";
import { getOperationalMembership } from "../auth/get-current-workspace";
import { projectScope, taskScope, clientSummary } from "../authorization/policies";
import { AccessError } from "../authorization/errors";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";

export async function getProjects(filters?: {
  status?: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED" | "ALL";
  query?: string;
}) {
  const member = await getOperationalMembership("projects");
  const workspaceId = member.workspaceId;

  return prisma.project.findMany({
    where: {
      ...projectScope(member),
      client: {
        workspaceId,
      },
      ...(filters?.status && filters.status !== "ALL"
        ? { status: filters.status }
        : {}),
      ...(filters?.query
        ? {
            OR: [
              {
                name: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
              {
                client: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true, name: true, description: true, status: true, deadline: true, clientId: true,
      workspaceId: true, createdAt: true, updatedAt: true,
      budget: member.role !== "STAFF",
      client: { select: clientSummary },
      tasks: { where: taskScope(member) },
      invoices: { where: member.role === "OWNER" ? {} : { id: { in: [] } } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createProjectForClient(data: { clientId: string; name: string; description?: string; deadline?: string; budget?: string }) {
  return workspaceMutation("projects:create", async (tx, member) => {
    const client = await tx.client.findFirst({ where: { id: data.clientId, workspaceId: member.workspaceId } });
    if (!client) throw new AccessError("NOT_FOUND");
    const entitlement = await requireCommercialAccess(member.workspaceId, true, tx);
    if (entitlement.projectLimit && await tx.project.count({ where: { workspaceId: member.workspaceId } }) >= entitlement.projectLimit) throw new CommercialError("Your plan project limit has been reached.");
    const project = await tx.project.create({ data: { name: data.name, description: data.description || null, deadline: data.deadline ? new Date(data.deadline) : null, budget: data.budget || null, clientId: client.id, workspaceId: member.workspaceId } });
    await audit(tx, member, "PROJECT_CREATED", "Project", project.id);
    return project;
  });
}
export async function getProjectById(id: string) {
  const member = await getOperationalMembership("projects");
  return prisma.project.findFirst({
    where: { id, ...projectScope(member) },
    select: {
      id: true, name: true, description: true, status: true, deadline: true, clientId: true,
      workspaceId: true, createdAt: true, updatedAt: true, budget: member.role !== "STAFF",
      client: { select: clientSummary },
      tasks: { where: taskScope(member), orderBy: { createdAt: "desc" } },
      invoices: { where: member.role === "OWNER" ? {} : { id: { in: [] } }, orderBy: { createdAt: "desc" } },
    },
  });
}
export async function updateProject(id: string, data: { name: string; description?: string; status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED"; deadline?: string; budget?: string }) {
  return workspaceMutation("projects:update", async (tx, member) => {
    const status = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).parse(data.status);
    const project = await tx.project.update({ where: { id, workspaceId: member.workspaceId }, data: { name: data.name, description: data.description || null, status, deadline: data.deadline ? new Date(data.deadline) : null, budget: data.budget || null } });
    await audit(tx, member, "PROJECT_UPDATED", "Project", id);
    return project;
  });
}
export async function updateProjectStatus(data: { projectId: string; status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED" }) {
  return workspaceMutation("projects:update", async (tx, member) => {
    const status = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).parse(data.status);
    const project = await tx.project.update({ where: { id: data.projectId, workspaceId: member.workspaceId }, data: { status } });
    await audit(tx, member, "PROJECT_STATUS_UPDATED", "Project", project.id, { status });
    return project;
  });
}
