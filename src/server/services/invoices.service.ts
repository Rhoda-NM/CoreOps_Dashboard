import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getInvoices(filters?: {
  query?: string;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" | "ALL";
  filter?: "all" | "outstanding" | "overdue";
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const now = new Date();

  return prisma.invoice.findMany({
    where: {
      client: {
        workspaceId,
      },

      ...(filters?.status && filters.status !== "ALL"
        ? {
            status: filters.status,
          }
        : {}),

      ...(filters?.filter === "outstanding"
        ? {
            status: {
              not: "PAID",
            },
          }
        : {}),

      ...(filters?.filter === "overdue"
        ? {
            OR: [
              {
                status: "OVERDUE",
              },
              {
                dueDate: {
                  lt: now,
                },
                status: {
                  notIn: ["PAID", "CANCELLED"],
                },
              },
            ],
          }
        : {}),

      ...(filters?.query
        ? {
            OR: [
              {
                invoiceNo: {
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
              {
                project: {
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
      project: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createInvoiceForClient(data: {
  clientId: string;
  invoiceNo: string;
  amount: string;
  dueDate?: string;
  projectId?: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const client = await prisma.client.findFirst({
    where: {
      id: data.clientId,
      workspaceId,
    },
    include: {
      projects: true,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (data.projectId) {
    const projectBelongsToClient = client.projects.some(
      (project) => project.id === data.projectId
    );

    if (!projectBelongsToClient) {
      throw new Error("Project does not belong to this client");
    }
  }

  return prisma.invoice.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId || null,
      invoiceNo: data.invoiceNo,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: "SENT",
    },
  });
}

export async function updateInvoiceStatus(data: {
  invoiceId: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
}) {
  const workspaceId = await getCurrentWorkspaceId();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: data.invoiceId,
      client: {
        workspaceId,
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return prisma.invoice.update({
    where: {
      id: data.invoiceId,
    },
    data: {
      status: data.status,
    },
  });
}