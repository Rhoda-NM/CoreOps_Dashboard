"use client";

import { useTransition } from "react";
import { updateInvoiceStatusAction } from "../actions/update-invoice-status";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

type InvoiceStatusSelectProps = {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  pathsToRevalidate?: string[];
};

export function InvoiceStatusSelect({
  invoiceId,
  currentStatus,
  pathsToRevalidate = [],
}: InvoiceStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as InvoiceStatus;

    startTransition(() => {
      updateInvoiceStatusAction(invoiceId, nextStatus, pathsToRevalidate);
    });
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-core-border bg-core-surface px-2.5 py-1.5 text-xs font-medium text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30 disabled:opacity-60"
    >
      <option value="DRAFT">DRAFT</option>
      <option value="SENT">SENT</option>
      <option value="PAID">PAID</option>
      <option value="OVERDUE">OVERDUE</option>
      <option value="CANCELLED">CANCELLED</option>
    </select>
  );
}