import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

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