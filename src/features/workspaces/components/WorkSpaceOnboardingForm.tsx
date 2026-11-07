"use client";
import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createWorkspaceAction } from "@/features/workspaces/actions/create-workspace";
import { checkWorkspaceSlugAction } from "@/features/workspaces/actions/check-workspace-slug";
import { selectedWorkspaceSlugMessage, suggestWorkspaceSlug } from "@/lib/routing/workspace-slug";

export function WorkspaceOnboardingForm({ defaultName = "", addressDomain = "workflowconnect.io" }: { defaultName?: string; addressDomain?: string }) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(() => suggestWorkspaceSlug(defaultName));
  const [edited, setEdited] = useState(false);
  const [state, action, isPending] = useActionState(createWorkspaceAction, { error: "" });
  const [checking, startCheck] = useTransition();
  const [availability, setAvailability] = useState<{ slug: string; message: string; status: string } | null>(null);
  const invalid = selectedWorkspaceSlugMessage(slug);
  const inputClass = "h-12 w-full rounded-xl border border-core-border bg-core-bg px-4 text-base text-white outline-none focus:border-core-accent focus:ring-2 focus:ring-core-accent/20";
  function updateName(value: string) {
    setName(value);
    if (!edited) setSlug(suggestWorkspaceSlug(value));
  }
  function checkAddress() {
    const checkedSlug = slug;
    startCheck(async () => {
      try { setAvailability({ ...await checkWorkspaceSlugAction(checkedSlug), slug: checkedSlug }); }
      catch { setAvailability({ slug: checkedSlug, status: "error", message: "Unable to check this address. Please try again." }); }
    });
  }
  return <div className="w-full max-w-xl rounded-2xl border border-core-border bg-core-card p-6 shadow-2xl sm:p-8">
    <header className="mb-8"><p className="text-sm font-semibold text-core-accent">Welcome to WorkflowConnect</p><h1 className="mt-2 text-3xl font-bold text-white">Create your workspace</h1><p className="mt-3 text-base leading-7 text-core-text-secondary">Set up your business, then choose your subscription. Business access follows payment verification and activation.</p></header>
    <form action={action} className="space-y-6">
      <div className="space-y-2"><label htmlFor="name" className="text-sm font-medium text-core-text">Business name</label><input id="name" name="name" required minLength={2} maxLength={120} value={name} onChange={event => updateName(event.target.value)} placeholder="Stravect Systems" className={inputClass}/></div>
      <div className="space-y-3"><label htmlFor="slug" className="text-sm font-medium text-core-text">Workspace address</label><input id="slug" name="slug" required minLength={3} maxLength={63} value={slug} onChange={event => { setEdited(true); setSlug(event.target.value); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!!invalid} aria-describedby="slug-help slug-preview slug-feedback" className={inputClass}/>
        <p id="slug-preview" className="break-all rounded-lg border border-core-border bg-core-surface p-3 text-base text-core-accent">{slug || "your-business"}.{addressDomain}</p>
        <p id="slug-help" className="text-sm leading-6 text-core-text-secondary">3–63 lowercase letters, numbers or hyphens. This address stays the same when you rename your business.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={!!invalid || checking || isPending} onClick={checkAddress} className="min-h-11 rounded-lg border border-core-border px-4 text-sm text-core-text disabled:opacity-50">{checking ? "Checking…" : "Check availability"}</button>{edited && <button type="button" onClick={() => { setEdited(false); setSlug(suggestWorkspaceSlug(name)); }} className="min-h-11 px-2 text-sm text-core-accent underline">Use suggested address</button>}</div>
        <p id="slug-feedback" role="status" aria-live="polite" className={`text-sm leading-6 ${invalid || (availability?.slug === slug && availability.status !== "available") ? "text-red-300" : "text-core-accent"}`}>{invalid ?? (availability?.slug === slug ? availability.message : "Availability is confirmed when you create your workspace.")}</p>
      </div>
      {state.error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
      <button type="submit" disabled={isPending || !!invalid} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-core-primary px-4 text-base font-semibold text-white disabled:opacity-60">{isPending ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin"/>Creating workspace…</> : "Create workspace"}</button>
      <p className="text-sm text-core-muted">No automatic trial. Your workspace starts pending activation.</p>
    </form>
  </div>;
}
