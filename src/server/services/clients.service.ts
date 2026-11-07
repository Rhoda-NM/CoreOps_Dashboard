import { requirePermission, workspaceMutation, audit } from "../authorization/authorize";
// src/server/services/clients.service.ts

import { prisma } from "@/server/db/prisma";

export async function getClients(filters?: {
  query?: string;
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
}) {
  const { workspaceId } = await requirePermission("clients:read");

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
  const { workspaceId, role } = await requirePermission("clients:read");

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
        where: role === "OWNER" ? {} : { id: { in: [] } },
        orderBy: {
          createdAt: "desc",
        },
        
      },
    },
  });
}

export async function createClient(data: { name: string; company?: string; email?: string; phone?: string }) {
  return workspaceMutation("clients:create", async (tx, member) => {
    const client = await tx.client.create({ data: { ...data, workspaceId: member.workspaceId } });
    await audit(tx, member, "CLIENT_CREATED", "Client", client.id);
    return client;
  });
}
export async function updateClient(id: string, data: { name: string; company?: string; email?: string; phone?: string }) {
  return workspaceMutation("clients:update", async (tx, member) => {
    const client = await tx.client.update({ where: { id, workspaceId: member.workspaceId }, data: { name: data.name, company: data.company || null, email: data.email || null, phone: data.phone || null } });
    await audit(tx, member, "CLIENT_UPDATED", "Client", id);
    return client;
  });
}
export async function archiveClient(id: string) {
  return workspaceMutation("clients:update", async (tx, member) => {
    const client = await tx.client.update({ where: { id, workspaceId: member.workspaceId }, data: { status: "ARCHIVED" } });
    await audit(tx, member, "CLIENT_ARCHIVED", "Client", id);
    return client;
  });
}
