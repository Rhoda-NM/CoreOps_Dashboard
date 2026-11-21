"use client";
import { CreationForm } from "@/features/creation/CreationForm";
export function CreateInvoiceForm({ clientId, defaultProjectId, forceOpen = false, initialOpen = false }: { clientId?: string; projects?: { id: string; name: string }[]; defaultProjectId?: string; forceOpen?: boolean; initialOpen?: boolean }) { return <CreationForm kind="invoice" clientId={clientId} projectId={defaultProjectId} initialOpen={forceOpen || initialOpen} />; }
