import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function createProjectForClient(data: {
  clientId: string;
  name: string;
  description?: string;
  deadline?: string;
  budget?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const client = await prisma.client.findFirst({
    where: {
      id: data.clientId,
      workspaceId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      budget: data.budget ? data.budget : null,
      clientId: data.clientId,
    },
  });
}