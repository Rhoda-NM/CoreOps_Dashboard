"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { useActionState, useEffect, useRef } from "react";
import type { InvitationAcceptanceState, InvitationView } from "./invitation-view";

const messages: Partial<Record<InvitationView["state"], { title: string; description: string }>> = {
  EXPIRED: { title: "This invitation has expired", description: "Ask the workspace owner to create a new invitation link. You do not need to create a workspace or buy a subscription to join their team." },
  UNAVAILABLE: { title: "Invitation unavailable", description: "This link may be invalid, withdrawn, or no longer available to this account. Ask the workspace owner for a new invitation." },
  SUSPENDED: { title: "Workspace access is suspended", description: "An invitation cannot restore a suspended membership. Contact the workspace owner to review your access." },
  RESTRICTED: { title: "The workspace cannot accept this invitation yet", description: "Ask the workspace owner to check their subscription, market availability and available member seats. You do not need a separate subscription." },
  WRONG_ACCOUNT: { title: "Use the invited account", description: "This account does not have the invited email verified. Sign out and use the correct account, or verify that address in your account settings. The invitation recipient will not be changed." },
  ACCOUNT_UNAVAILABLE: { title: "We could not check this invitation", description: "Check your account access and connection, then reload this private link. If the problem continues, contact support. No membership has been granted by this page." },
};

export function InvitationCard({ initialView, signInHref, signUpHref, acceptAction }: {
  initialView: InvitationView;
  signInHref: string;
  signUpHref: string;
  acceptAction: (previous: InvitationAcceptanceState, data: FormData) => Promise<InvitationAcceptanceState>;
}) {
  const [state, action, pending] = useActionState(acceptAction, { message: "" });
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.message) feedback.current?.focus(); }, [state]);
  const view = state.view ?? initialView;
  const message = messages[view.state];
  const title = message?.title ?? (view.workspaceName ? `You’ve been invited to join ${view.workspaceName}` : "You’ve been invited to collaborate");
  return <main className="invitation-page">
    <section className="invitation-card" aria-labelledby="invitation-title">
      <p className="text-xs font-semibold uppercase tracking-widest text-core-accent">WorkflowConnect · Team invitation</p>
      <h1 id="invitation-title" className="mt-3 text-2xl font-semibold leading-tight">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-core-text-secondary">{message?.description ?? "A teammate has invited you to collaborate in their existing workspace. Review the invitation before joining."}</p>
      {(view.maskedEmail || view.workspaceName) && <dl className="invitation-details">
        {view.workspaceName && <div><dt>Workspace</dt><dd>{view.workspaceName}</dd></div>}
        {view.role && <div><dt>Invited role</dt><dd>{view.role[0] + view.role.slice(1).toLowerCase()}</dd></div>}
        <div><dt>Invited email{!view.email ? " (protected)" : ""}</dt><dd>{view.email ?? view.maskedEmail}</dd></div>
        {view.expiresAt && <div><dt>Link expires</dt><dd><time dateTime={view.expiresAt}>{new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(view.expiresAt))} EAT</time></dd></div>}
      </dl>}
      {view.state === "SIGN_IN" && <>
        <p className="mt-5 text-sm leading-6 text-core-text-secondary">Sign in or create an account using the invited email. The workspace and role are shown after your verified identity matches. Signing in does not accept the invitation.</p>
        <div className="invitation-actions"><Link className="invitation-primary" href={signInHref}>Sign in</Link><Link className="invitation-secondary" href={signUpHref}>Create account</Link></div>
      </>}
      {state.message && <p ref={feedback} tabIndex={-1} role="alert" className="mt-5 rounded-lg border border-core-border p-3 text-sm leading-6">{state.message}</p>}
      {view.state === "READY" && <form action={action} aria-busy={pending} className="mt-6">
        <button className="invitation-primary w-full" disabled={pending}>{pending ? "Accepting invitation…" : "Accept invitation"}</button>
        <p role="status" className="mt-3 text-sm text-core-text-secondary">{pending ? "Checking your invitation and the workspace’s available seats." : "You will join the existing workspace. No separate workspace or subscription will be created."}</p>
      </form>}
      {view.state === "ACCEPTED" && view.continuation && <div className="mt-6"><p role="status" className="mb-4 text-sm leading-6">This invitation has already been accepted by your account. Your existing membership and role are preserved.</p><Link className="invitation-primary" href={view.continuation}>Continue to workspace</Link></div>}
      {view.state === "WRONG_ACCOUNT" && <div className="invitation-actions"><SignOutButton redirectUrl={signInHref}><button type="button" className="invitation-primary">Sign out and use the invited account</button></SignOutButton><Link href="/account" className="invitation-secondary">Account settings</Link></div>}
      <footer className="mt-7 border-t border-core-border pt-4 text-xs leading-6 text-core-text-secondary"><p>Keep this link private. Share it only with the intended teammate.</p><Link href="/auth-help" className="underline">Account and invitation help</Link></footer>
    </section>
  </main>;
}
