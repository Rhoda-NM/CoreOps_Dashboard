"use server";

import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { quickInvoiceFailure, type QuickInvoiceErrorCode } from "@/server/privacy/safe-failure";

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
  code?: QuickInvoiceErrorCode | "QUICK_INVOICE_VALIDATION";
  reference?: string;
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
      code: "QUICK_INVOICE_VALIDATION",
      fieldErrors: {
        clientId: errors.clientId?.[0],
        projectId: errors.projectId?.[0],
        invoiceNo: errors.invoiceNo?.[0],
        amount: errors.amount?.[0],
        dueDate: errors.dueDate?.[0],
      },
    };
  }

  let invoice;
  try {
    invoice = await createInvoiceForClient({
      clientId: result.data.clientId,
      projectId: result.data.projectId,
      invoiceNo: result.data.invoiceNo,
      amount: result.data.amount.toString(),
      dueDate: result.data.dueDate,
      status: "DRAFT",
    });
  } catch (error) {
    unstable_rethrow(error); // Preserve Next authentication redirects/not-found control flow.
    const failure = quickInvoiceFailure(error, "CREATE");
    return { success: false, message: `${failure.message} Reference: ${failure.reference}`, code: failure.code, reference: failure.reference, fieldErrors: {} };
  }

  try {
    await revalidateWorkspacePath("/dashboard");
    await revalidateWorkspacePath("/invoices");
    await revalidateWorkspacePath(`/clients/${result.data.clientId}`);
    if (result.data.projectId) await revalidateWorkspacePath(`/projects/${result.data.projectId}`);
  } catch (error) {
    unstable_rethrow(error);
    const failure = quickInvoiceFailure(error, "REFRESH");
    // Creation already committed. Do not encourage a duplicate creation retry.
    return { success: true, message: `${failure.message} Reference: ${failure.reference}`, code: failure.code, reference: failure.reference, fieldErrors: {} };
  }

  return { success: true, message: invoice.status === "DRAFT" ? "Invoice draft created." : "Invoice created.", fieldErrors: {} };
}
