import { workspaceMutation, audit } from "../authorization/authorize";
import { getOperationalMembership } from "../auth/get-current-workspace";
import { taskScope, taskWriteScope, projectSummary } from "../authorization/policies";
import { AccessError } from "../authorization/errors";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";


export async function getTasks(filters?: {
  query?: string;
  status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "ALL";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "ALL";
  filter?: "overdue" | "pending" | "all";
}) {
  const member = await getOperationalMembership("tasks");
  const workspaceId = member.workspaceId;

  const now = new Date();

  return prisma.task.findMany({
    where: {
      AND: [taskScope(member)],
      project: {
        client: {
          workspaceId,
        },
      },

      ...(filters?.status && filters.status !== "ALL"
        ? {
            status: filters.status,
          }
        : {}),

      ...(filters?.priority && filters.priority !== "ALL"
        ? {
            priority: filters.priority,
          }
        : {}),

      ...(filters?.filter === "pending"
        ? {
            status: {
              not: "DONE",
            },
          }
        : {}),

      ...(filters?.filter === "overdue"
        ? {
            dueDate: {
              lt: now,
            },
            status: {
              not: "DONE",
            },
          }
        : {}),

      ...(filters?.query
        ? {
            OR: [
              {
                title: {
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
                project: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive",
                  },
                },
              },
              {
                project: {
                  client: {
                    name: {
                      contains: filters.query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },

    include: { project: { select: projectSummary } },

    orderBy: [
      {
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function createTaskForProject(data: { projectId: string; title: string; description?: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate?: string }) {
  return workspaceMutation("tasks:create", async (tx, member) => {
    const project = await tx.project.findFirst({ where: { id: data.projectId, workspaceId: member.workspaceId } });
    if (!project) throw new AccessError("NOT_FOUND");
    const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).parse(data.priority);
    const task = await tx.task.create({ data: { title: data.title, description: data.description || null, priority, dueDate: data.dueDate ? new Date(data.dueDate) : null, projectId: project.id, workspaceId: member.workspaceId } });
    await audit(tx, member, "TASK_CREATED", "Task", task.id);
    return task;
  });
}
export async function updateTaskStatus(data: { taskId: string; status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" }) {
  return workspaceMutation(null, async (tx, member) => {
    const status = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).parse(data.status);
    const task = await tx.task.findFirst({ where: { id: data.taskId, ...taskWriteScope(member) } });
    if (!task) throw new AccessError("NOT_FOUND");
    const updated = await tx.task.update({ where: { id: task.id, workspaceId: member.workspaceId, AND: [taskWriteScope(member)] }, data: { status } });
    await audit(tx, member, "TASK_STATUS_UPDATED", "Task", task.id, { status });
    return updated;
  });
}
export async function updateTaskDetails(taskId: string, data: { title: string; description?: string }) {
  const parsed = z.object({ title: z.string().trim().min(2).max(250), description: z.string().max(10000).optional() }).parse(data);
  return workspaceMutation(null, async (tx, member) => {
    const task = await tx.task.update({ where: { id: taskId, workspaceId: member.workspaceId, AND: [taskWriteScope(member)] }, data: { title: parsed.title, description: parsed.description || null } });
    await audit(tx, member, "TASK_UPDATED", "Task", task.id);
    return task;
  });
}
