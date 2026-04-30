// src/server/services/clients.service.ts

import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getClients() {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.client.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
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