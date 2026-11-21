"use client";
import { CreateProjectForm } from "@/features/projects/components/CreateProjectForm";
import { CreateInvoiceForm } from "@/features/invoices/components/CreateInvoiceForm";
export function ClientActionPanel({ role, clientId }: { role: "OWNER" | "MANAGER" | "STAFF"; clientId: string; projects?: { id: string; name: string }[] }) {
  if (role === "STAFF") return null;
  return <section className="flex flex-wrap gap-3"><CreateProjectForm clientId={clientId} />{role === "OWNER" && <CreateInvoiceForm clientId={clientId} />}</section>;
}
