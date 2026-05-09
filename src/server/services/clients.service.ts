// src/server/services/clients.service.ts

import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getClients(filters?: {
  query?: string;
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
}) {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.client.findMany({
    where: {
      workspaceId,
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
                company: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: filters.query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getClientById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.client.findFirst({
    where: {
      id,
      workspaceId,
    },
    include: {
      projects: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          tasks: true,
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

export async function createClient(data: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.client.create({
    data: {
      ...data,
      workspaceId,
    },
  });
}

export async function updateClient(
  id: string,
  data: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  }
) {
  const workspaceId = await getCurrentWorkspaceId();

  const client = await prisma.client.findFirst({
    where: {
      id,
      workspaceId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  return prisma.client.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
    },
  });
}

export async function archiveClient(id: string) {
  const workspaceId = await getCurrentWorkspaceId();

  const client = await prisma.client.findFirst({
    where: {
      id,
      workspaceId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  return prisma.client.update({
    where: {
      id,
    },
    data: {
      status: "ARCHIVED",
    },
  });
}