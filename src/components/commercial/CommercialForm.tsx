"use client";
import { useActionState } from "react";
export type CommercialState = { error?: string; success?: string; paymentUrl?: string };
export function CommercialForm({ action, children, label, className = "" }: { action: (state: CommercialState, data: FormData) => Promise<CommercialState>; children?: React.ReactNode; label: string; className?: string }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className={`space-y-3 ${className}`}>
    <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">{children}<button className="rounded-lg bg-core-primary px-4 py-2 font-medium text-white hover:bg-core-primary-hover disabled:opacity-50" disabled={pending}>{pending ? "Saving…" : label}</button></fieldset>
    {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
    {state.paymentUrl && <a href={state.paymentUrl} className="block text-core-accent underline">Continue to Paystack checkout</a>}
    {state.success && <p role="status" className="text-sm text-emerald-400">{state.success}</p>}
  </form>;
}
