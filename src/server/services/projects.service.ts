import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getProjects(filters?: {
  status?: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED" | "ALL";
  query?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.project.findMany({
    where: {
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
    include: {
      client: true,
      tasks: true,
      invoices: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

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

export async function getProjectById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.project.findFirst({
    where: {
      id,
      client: {
        workspaceId,
      },
    },
    include: {
      client: true,
      tasks: {
        orderBy: {
          createdAt: "desc",
        },
      },
      invoices: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function updateProject(
  id: string,
  data: {
    name: string;
    description?: string;
    status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
    deadline?: string;
    budget?: string;
  }
) {
  const workspaceId = await getCurrentWorkspaceId();

  const project = await prisma.project.findFirst({
    where: {
      id,
      client: {
        workspaceId,
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return prisma.project.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      description: data.description || null,
      status: data.status,
      deadline: data.deadline ? new Date(data.deadline) : null,
      budget: data.budget ? data.budget : null,
    },
  });
}

export async function updateProjectStatus(data: {
  projectId: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
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

  return prisma.project.update({
    where: {
      id: data.projectId,
    },
    data: {
      status: data.status,
    },
  });
}