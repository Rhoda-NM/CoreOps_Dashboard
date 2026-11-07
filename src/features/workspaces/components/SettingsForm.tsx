"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

function SubmitButton({ label, pendingLabel, danger }: { label: string; pendingLabel: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={danger ? "secondary" : "primary"} className={danger ? "gap-2 border-red-500/25 text-red-300 hover:bg-red-500/10" : "gap-2"}>
      {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function SettingsForm({ action, children, label, pendingLabel = "Saving…", successMessage = "Changes saved.", danger = false }: {
  action: (form: FormData) => Promise<void>;
  children?: ReactNode;
  label: string;
  pendingLabel?: string;
  successMessage?: string;
  danger?: boolean;
}) {
  const [state, submit, pending] = useActionState(async (_previous: { success: boolean; message: string }, form: FormData) => {
    try {
      await action(form);
      return { success: true, message: successMessage };
    } catch {
      return { success: false, message: "Unable to complete this change. Check your access and try again." };
    }
  }, { success: false, message: "" });

  return (
    <form action={submit} className="space-y-4">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={label} pendingLabel={pendingLabel} danger={danger} />
        <p role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-xs ${state.success ? "text-emerald-300" : "text-red-300"}`}>
          {!pending && state.success && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}{!pending && state.message}
        </p>
      </div>
    </form>
  );
}
