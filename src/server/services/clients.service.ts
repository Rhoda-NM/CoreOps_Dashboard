// src/server/services/clients.service.ts

import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getClients() {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.client.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      status: true,
      createdAt: true,
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