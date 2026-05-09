"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/dashboard");
  revalidatePath("/invoices");

  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }

  return {
    success: true,
  };
}