import { z } from "zod";

export const invoiceSchema = z.object({
  invoiceNo: z.string().min(2, "Invoice number is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;