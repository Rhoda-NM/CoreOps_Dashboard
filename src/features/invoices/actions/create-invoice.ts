"use server";

import { revalidatePath } from "next/cache";
import { invoiceSchema } from "../schemas/invoice-schema";
import { createInvoiceForClient } from "@/server/services/invoices.service";

export async function createInvoiceAction(
  clientId: string,
  formData: FormData
): Promise<void> {
  const rawData = {
    invoiceNo: formData.get("invoiceNo"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    projectId: formData.get("projectId"),
  };

  const result = invoiceSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error("Invalid invoice data");
  }

  await createInvoiceForClient({
    clientId,
    invoiceNo: result.data.invoiceNo,
    amount: result.data.amount,
    dueDate: result.data.dueDate || undefined,
    projectId: result.data.projectId || undefined,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  {/*if (result.data.projectId) {
    revalidatePath(`/projects/${result.data.projectId}`);
  }

  return {
    success: true,
  };*/}
}

