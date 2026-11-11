import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AccessError } from "../authorization/errors";

export type QuickInvoiceErrorCode = "QUICK_INVOICE_UNAVAILABLE" | "QUICK_INVOICE_CONFLICT" | "QUICK_INVOICE_FAILED" | "QUICK_INVOICE_REFRESH_FAILED";
const messages = {
  QUICK_INVOICE_UNAVAILABLE: "Unable to create this invoice. Check your access and selected records.",
  QUICK_INVOICE_CONFLICT: "This invoice could not be created because it conflicts with an existing record. Refresh and review before retrying.",
  QUICK_INVOICE_FAILED: "Unable to create this invoice. Please try again or contact support.",
  QUICK_INVOICE_REFRESH_FAILED: "The invoice was created. Refresh this page to view it.",
} as const;

// Only closed codes + server-generated references enter ordinary logs. Never
// dump, spread, serialize or pass the exception itself to a logging sink.
export function quickInvoiceFailure(error: unknown, operation: "CREATE" | "REFRESH") {
  let code: QuickInvoiceErrorCode = "QUICK_INVOICE_FAILED";
  if (operation === "REFRESH") code = "QUICK_INVOICE_REFRESH_FAILED";
  else if (error instanceof AccessError) code = error.code === "CONFLICT" ? "QUICK_INVOICE_CONFLICT" : "QUICK_INVOICE_UNAVAILABLE";
  else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") code = "QUICK_INVOICE_CONFLICT";
  const reference = randomUUID();
  try { console.error(JSON.stringify({ event: "QUICK_INVOICE_OPERATION_FAILED", code, reference })); } catch { /* Sink failure must not expose the exception or undo a committed invoice. */ }
  return { code, reference, message: messages[code] };
}
