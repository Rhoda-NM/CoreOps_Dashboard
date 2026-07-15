"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Receipt } from "lucide-react";

import {
  quickCreateInvoiceAction,
  type QuickInvoiceActionState,
} from "../actions/quick-create-invoice";

type ProjectOption = {
  id: string;
  name: string;
};

type ClientOption = {
  id: string;
  name: string;
  company: string | null;
  projects: ProjectOption[];
};

type QuickInvoiceFormProps = {
  clients: ClientOption[];
  onBack: () => void;
  onSuccess?: () => void;
};

const initialState: QuickInvoiceActionState = {
  success: false,
  message: "",
  fieldErrors: {},
};

export function QuickInvoiceForm({
  clients,
  onBack,
  onSuccess,
}: QuickInvoiceFormProps) {
  const [selectedClientId, setSelectedClientId] = useState("");

  const [state, formAction, isPending] = useActionState(
    quickCreateInvoiceAction,
    initialState
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  const availableProjects = selectedClient?.projects ?? [];

  useEffect(() => {
    if (!state.success) return;

    const timeout = window.setTimeout(() => {
      onSuccess?.();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [state.success, onSuccess]);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-core-border px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-2 text-core-text-secondary transition hover:bg-core-surface hover:text-core-text"
          aria-label="Back to quick actions"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-core-primary/10 text-indigo-300">
          <Receipt className="h-4 w-4" />
        </div>

        <div>
          <p className="font-semibold text-core-text">Quick invoice</p>
          <p className="text-xs text-core-text-secondary">
            Draft an invoice without leaving your current page.
          </p>
        </div>
      </div>

      <form action={formAction} className="grid gap-5 p-5">
        <div className="grid gap-2">
          <label
            htmlFor="quick-invoice-client"
            className="text-sm font-medium text-core-text"
          >
            Client
          </label>

          <select
            id="quick-invoice-client"
            name="clientId"
            required
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            className="w-full rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
          >
            <option value="">Select a client</option>

            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.company ? ` — ${client.company}` : ""}
              </option>
            ))}
          </select>

          {state.fieldErrors?.clientId && (
            <p className="text-xs text-red-400">
              {state.fieldErrors.clientId}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="quick-invoice-number"
              className="text-sm font-medium text-core-text"
            >
              Invoice number
            </label>

            <input
              id="quick-invoice-number"
              name="invoiceNo"
              required
              autoFocus
              placeholder="INV-2026-001"
              className="w-full rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none transition placeholder:text-core-muted focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
            />

            {state.fieldErrors?.invoiceNo && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.invoiceNo}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="quick-invoice-amount"
              className="text-sm font-medium text-core-text"
            >
              Amount
            </label>

            <input
              id="quick-invoice-amount"
              name="amount"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="50000"
              className="w-full rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none transition placeholder:text-core-muted focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
            />

            {state.fieldErrors?.amount && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.amount}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="quick-invoice-project"
              className="text-sm font-medium text-core-text"
            >
              Project
              <span className="ml-1 font-normal text-core-muted">
                optional
              </span>
            </label>

            <select
              id="quick-invoice-project"
              name="projectId"
              defaultValue=""
              disabled={!selectedClientId}
              className="w-full rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {selectedClientId
                  ? "No specific project"
                  : "Select a client first"}
              </option>

              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {state.fieldErrors?.projectId && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.projectId}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="quick-invoice-due-date"
              className="text-sm font-medium text-core-text"
            >
              Due date
            </label>

            <input
              id="quick-invoice-due-date"
              name="dueDate"
              type="date"
              className="w-full rounded-xl border border-core-border bg-core-surface px-3 py-2.5 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30"
            />

            {state.fieldErrors?.dueDate && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.dueDate}
              </p>
            )}
          </div>
        </div>

        <input type="hidden" name="status" value="DRAFT" />

        {state.message && (
          <div
            className={
              state.success
                ? "flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                : "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            }
          >
            {state.success && <Check className="h-4 w-4" />}
            {state.message}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-core-border pt-5">
          <p className="text-xs text-core-muted">
            Quick invoices are saved as drafts.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-core-text-secondary transition hover:bg-core-surface hover:text-core-text disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-core-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-core-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save draft"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}