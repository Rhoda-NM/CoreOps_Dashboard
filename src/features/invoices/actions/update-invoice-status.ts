"use server";

import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { updateInvoiceStatus } from "@/server/services/invoices.service";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: InvoiceStatus,
  pathsToRevalidate: string[] = []
) {
  await updateInvoiceStatus({
    invoiceId,
    status,
  });

  await revalidateWorkspacePath("/dashboard");
  await revalidateWorkspacePath("/invoices");

  for (const path of pathsToRevalidate) {
    await revalidateWorkspacePath(path);
  }

  return {
    success: true,
  };
}