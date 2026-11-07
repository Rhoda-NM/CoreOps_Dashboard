import { requirePermission, workspaceMutation, audit } from "../authorization/authorize";
import { AccessError } from "../authorization/errors";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";

export async function getInvoices(filters?: {
  query?: string;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" | "ALL";
  filter?: "all" | "outstanding" | "overdue";
}) {
  const { workspaceId } = await requirePermission("invoices:read");

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


export async function createInvoiceForClient(data: { clientId: string; projectId?: string; invoiceNo: string; amount: string; dueDate?: string; status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" }) {
  return workspaceMutation("invoices:create", async (tx, member) => {
    const client = await tx.client.findFirst({ where: { id: data.clientId, workspaceId: member.workspaceId } });
    if (!client) throw new AccessError("NOT_FOUND");
    if (data.projectId && !await tx.project.findFirst({ where: { id: data.projectId, clientId: client.id, workspaceId: member.workspaceId } })) throw new AccessError("NOT_FOUND");
    const invoice = await tx.invoice.create({ data: { clientId: client.id, projectId: data.projectId || null, workspaceId: member.workspaceId, invoiceNo: data.invoiceNo, amount: data.amount, dueDate: data.dueDate ? new Date(data.dueDate) : null, status: data.status || "SENT" } });
    await audit(tx, member, "INVOICE_CREATED", "Invoice", invoice.id);
    return invoice;
  });
}
export async function updateInvoiceStatus(data: { invoiceId: string; status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" }) {
  return workspaceMutation("invoices:update", async (tx, member) => {
    const status = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).parse(data.status);
    const invoice = await tx.invoice.update({ where: { id: data.invoiceId, workspaceId: member.workspaceId }, data: { status } });
    await audit(tx, member, "INVOICE_STATUS_UPDATED", "Invoice", invoice.id, { status });
    return invoice;
  });
}
