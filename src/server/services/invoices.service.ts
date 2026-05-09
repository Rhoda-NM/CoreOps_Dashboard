import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function getInvoices() {
  const workspaceId = await getCurrentWorkspaceId();

  return prisma.invoice.findMany({
    where: {
      client: {
        workspaceId,
      },
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