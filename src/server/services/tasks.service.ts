import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getTasks() {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.task.findMany({
    where: {
      project: {
        client: {
          workspaceId,
        },
      },
    },
    include: {
      project: {
        include: {
          client: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createTaskForProject(data: {
  projectId: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const project = await prisma.project.findFirst({
    where: {
      id: data.projectId,
      client: {
        workspaceId,
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });
}

export async function updateTaskStatus(data: {
  taskId: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const task = await prisma.task.findFirst({
    where: {
      id: data.taskId,
      project: {
        client: {
          workspaceId,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  return prisma.task.update({
    where: {
      id: data.taskId,
    },
    data: {
      status: data.status,
    },
  });
}