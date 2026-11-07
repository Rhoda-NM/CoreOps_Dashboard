"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2, Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { inviteAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const roleDescriptions = {
  STAFF: "Assigned projects and tasks. No access to budgets, contacts, or financial records.",
  MANAGER: "Clients, projects, budgets, and team assignments. No invoices or workspace administration.",
  OWNER: "Full workspace access, including financial records, memberships, and settings.",
};

export function InvitationForm() {
  const [role, setRole] = useState<keyof typeof roleDescriptions>("STAFF");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [state, action, pending] = useActionState(async (previous: { error: string; path: string }, form: FormData) => {
    setCopied(false);
    setCopyError(false);
    return inviteAction(previous, form);
  }, { error: "", path: "" });
  const invitationUrl = state.path && typeof window !== "undefined" ? `${window.location.origin}${state.path}` : state.path;

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <section className="rounded-2xl border border-core-border bg-core-card p-5 sm:p-6" aria-labelledby="invite-heading">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-core-primary/10 text-indigo-300"><UserPlus aria-hidden="true" className="h-5 w-5" /></div>
        <div><h2 id="invite-heading" className="font-semibold text-core-text">Invite a teammate</h2><p className="mt-1 text-sm text-core-text-secondary">Give the right people access to your workspace.</p></div>
      </div>
      <form action={action} className="space-y-4">
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Input id="invitation-email" label="Email address" type="email" name="email" placeholder="teammate@company.com" autoComplete="email" required />
          <div className="grid content-start gap-2">
            <label htmlFor="invitation-role" className="text-sm font-medium text-core-text">Workspace role</label>
            <select id="invitation-role" name="role" value={role} onChange={event => setRole(event.target.value as keyof typeof roleDescriptions)} aria-describedby="invitation-role-description" className="h-[38px] w-full rounded-lg border border-core-border bg-core-surface px-3 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30">
              <option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="OWNER">Owner</option>
            </select>
          </div>
        </fieldset>
        <div id="invitation-role-description" className="flex items-start gap-2 rounded-xl bg-core-surface/70 px-3 py-3 text-xs leading-5 text-core-text-secondary"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" /><span>{roleDescriptions[role]}</span></div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-core-muted"><Mail aria-hidden="true" className="h-3.5 w-3.5" />Share a private link · valid for 7 days</p>
          <Button type="submit" disabled={pending} className="gap-2">{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}{pending ? "Creating link…" : "Create invitation link"}</Button>
        </div>
        <p className="text-xs leading-5 text-core-muted">Email is not sent automatically. Share the invitation only with the intended teammate.</p>
        {state.error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
        {state.path && <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <label htmlFor="invitation-link" className="flex items-center gap-2 text-sm font-medium text-emerald-300"><Check aria-hidden="true" className="h-4 w-4" />Your invitation is ready</label>
          <div className="flex min-w-0 gap-2"><input id="invitation-link" className="min-w-0 flex-1 rounded-lg border border-core-border bg-core-surface px-3 py-2 text-xs text-core-text outline-none focus:ring-2 focus:ring-core-primary/30" readOnly value={invitationUrl} onFocus={event => event.target.select()} /><Button type="button" variant="secondary" onClick={copyInvitation} className="gap-2">{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</Button></div>
          <p role="status" className="text-xs text-core-text-secondary">{copyError ? "Select and copy the link above to share it." : copied ? "Invitation link copied to clipboard." : "Only the invited email address can accept this link."}</p>
        </div>}
      </form>
    </section>
  );
}
