import { prisma } from "@/server/db/prisma";
import { getCurrentWorkspaceId } from "@/server/auth/get-current-workspace";

export async function createInvoiceForClient(data: {
  clientId: string;
  invoiceNo: string;
  amount: string;
  dueDate?: string;
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

  return prisma.invoice.create({
    data: {
      clientId: data.clientId,
      invoiceNo: data.invoiceNo,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: "SENT",
    },
  });
}