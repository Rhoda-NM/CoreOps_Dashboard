"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ email: string; role: string } | null>(null);
  const formElement = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const link = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [state, action, pending] = useActionState(async (previous: { error: string; path: string }, form: FormData) => {
    setSubmitted({ email: String(form.get("email") ?? ""), role: String(form.get("role") ?? "STAFF") });
    setCopied(false);
    setCopyError(false);
    try { return await inviteAction(previous, form); }
    catch (error) {
      unstable_rethrow(error);
      return { error: "Connection interrupted. Check whether a link was created before trying again.", path: "" };
    }
  }, { error: "", path: "" });
  const invitationUrl = state.path;
  useEffect(() => {
    // React resets successful action transports even when the result contains a
    // validation error. Its commit-time reset can bypass delegated onReset.
    // Keep the owner's draft values; this does not affect the server action.
    const form = formElement.current;
    const preserveDraft = (event: Event) => event.preventDefault();
    form?.addEventListener("reset", preserveDraft);
    return () => form?.removeEventListener("reset", preserveDraft);
  }, []);
  useEffect(() => { if (!pending && (state.error || state.path)) feedback.current?.focus(); }, [state, pending]);

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      link.current?.focus();
      link.current?.select();
    }
  }

  return (
    <section className="invitation-owner rounded-2xl border border-core-border bg-core-card p-5 sm:p-6" aria-labelledby="invite-heading">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-core-primary/10 text-core-accent"><UserPlus aria-hidden="true" className="h-5 w-5" /></div>
        <div><h2 id="invite-heading" className="font-semibold text-core-text">Invite a teammate</h2><p className="mt-1 text-sm text-core-text-secondary">Give the right people access to your workspace.</p></div>
      </div>
      <form ref={formElement} action={action} aria-busy={pending} className="space-y-4">
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Input id="invitation-email" label="Email address" type="email" name="email" placeholder="teammate@company.com" autoComplete="email" aria-describedby="invitation-email-help" value={email} onChange={event => setEmail(event.target.value)} required />
          <div className="grid content-start gap-2">
            <label htmlFor="invitation-role" className="text-sm font-medium text-core-text">Workspace role</label>
            <select id="invitation-role" name="role" value={role} onChange={event => setRole(event.target.value as keyof typeof roleDescriptions)} aria-describedby="invitation-role-description" className="h-[38px] w-full rounded-lg border border-core-border bg-core-surface px-3 text-sm text-core-text outline-none focus:border-core-primary focus:ring-2 focus:ring-core-primary/30">
              <option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="OWNER">Owner</option>
            </select>
          </div>
        </fieldset>
        <p id="invitation-email-help" className="text-xs leading-5 text-core-text-secondary">They must sign in with this verified email to accept. Creating a link does not send an email.</p>
        <div id="invitation-role-description" className="flex items-start gap-2 rounded-xl bg-core-surface/70 px-3 py-3 text-xs leading-5 text-core-text-secondary"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-core-accent" /><span>{roleDescriptions[role]}</span></div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-core-muted"><Mail aria-hidden="true" className="h-3.5 w-3.5" />Share a private link · valid for 7 days</p>
          <Button type="submit" disabled={pending} className="gap-2">{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}{pending ? "Creating link…" : "Create invitation link"}</Button>
        </div>
        <p className="text-xs leading-5 text-core-muted">Email is not sent automatically. Share the invitation only with the intended teammate.</p>
        {!pending && state.error && <p ref={feedback} tabIndex={-1} role="alert" className="ui-feedback" data-tone="danger">{state.error} Review the email and available member seats, then try again.</p>}
        {!pending && state.path && <div className="space-y-3 rounded-xl border border-core-border bg-core-surface p-4">
          <p ref={feedback} tabIndex={-1} role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-300"><Check aria-hidden="true" className="h-4 w-4" />Your invitation is ready</p>
          {submitted && <p className="text-xs leading-5 text-core-text-secondary">Requested for {submitted.email} · {roleDescriptions[submitted.role as keyof typeof roleDescriptions] ? submitted.role[0] + submitted.role.slice(1).toLowerCase() : "Teammate"}. Editing the form does not change this link.</p>}
          <label htmlFor="invitation-link" className="text-sm font-medium">Private invitation link</label>
          <div className="invitation-copy-row"><input ref={link} id="invitation-link" className="min-w-0 flex-1 rounded-lg border border-core-border bg-core-surface px-3 py-2 text-xs text-core-text outline-none focus:ring-2 focus:ring-core-primary/30" readOnly value={invitationUrl} onFocus={event => event.target.select()} /><Button type="button" variant="secondary" onClick={copyInvitation} className="gap-2">{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</Button></div>
          <p role="status" className="text-xs text-core-text-secondary">{copyError ? "Select and copy the link above to share it." : copied ? "Invitation link copied to clipboard." : "Only the invited email address can accept this link."}</p>
        </div>}
      </form>
    </section>
  );
}
