"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createInvoiceForClient } from "@/server/services/invoices.service";

const quickInvoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  projectId: z.string().optional(),
  invoiceNo: z.string().trim().min(2, "Invoice number is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.string().optional(),
});

export type QuickInvoiceActionState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    clientId?: string;
    projectId?: string;
    invoiceNo?: string;
    amount?: string;
    dueDate?: string;
  };
};

export async function quickCreateInvoiceAction(
  _previousState: QuickInvoiceActionState,
  formData: FormData
): Promise<QuickInvoiceActionState> {
  const result = quickInvoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId") || undefined,
    invoiceNo: formData.get("invoiceNo"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;

    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        clientId: errors.clientId?.[0],
        projectId: errors.projectId?.[0],
        invoiceNo: errors.invoiceNo?.[0],
        amount: errors.amount?.[0],
        dueDate: errors.dueDate?.[0],
      },
    };
  }

  try {
    await createInvoiceForClient({
      clientId: result.data.clientId,
      projectId: result.data.projectId,
      invoiceNo: result.data.invoiceNo,
      amount: result.data.amount.toString(),
      dueDate: result.data.dueDate,
    });

    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath(`/clients/${result.data.clientId}`);

    if (result.data.projectId) {
      revalidatePath(`/projects/${result.data.projectId}`);
    }

    return {
      success: true,
      message: "Invoice draft created.",
      fieldErrors: {},
    };
  } catch (error) {
    console.error("Quick invoice creation failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create the invoice draft.",
      fieldErrors: {},
    };
  }
}