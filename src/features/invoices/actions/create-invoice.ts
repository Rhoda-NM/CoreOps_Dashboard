"use server";

import { revalidatePath } from "next/cache";
import { invoiceSchema } from "../schemas/invoice-schema";
import { createInvoiceForClient } from "@/server/services/invoices.service";

export async function createInvoiceAction(
  clientId: string,
  formData: FormData
) {
  const rawData = {
    invoiceNo: formData.get("invoiceNo"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  };

  const result = invoiceSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      error: "Invalid invoice data",
    };
  }

  await createInvoiceForClient({
    clientId,
    invoiceNo: result.data.invoiceNo,
    amount: result.data.amount,
    dueDate: result.data.dueDate || undefined,
  });

  revalidatePath(`/clients/${clientId}`);

  return {
    success: true,
  };
}