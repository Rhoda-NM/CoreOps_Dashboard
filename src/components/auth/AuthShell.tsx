import Link from "@/components/workspaces/SiteLink";
import { Brand } from "@/components/brand/Brand";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LegalLinks } from "./LegalLinks";

export function AuthShell({ children, registering = false }: { children: ReactNode; registering?: boolean }) {
  return <main className="min-h-screen bg-core-bg px-5 py-8 text-core-text sm:px-8 lg:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-core-text"><Brand /></Link>
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
        <section className="space-y-6 lg:pt-8"><p className="text-xs font-medium uppercase tracking-[0.16em] text-core-accent">Your business. One workspace.</p><h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{registering ? "A clear start for your team." : "Welcome back to WorkflowConnect."}</h1><p className="max-w-md text-sm leading-7 text-core-text-secondary">{registering ? "Create your account, then choose whether to set up a business workspace or accept a teammate’s invitation." : "Sign in to return to your workspaces. Your role and assigned work stay separate in each business."}</p>
          <section aria-labelledby="google-privacy-heading" className="space-y-3 rounded-2xl border border-core-border bg-core-card/70 p-5"><h2 id="google-privacy-heading" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-core-accent" />What signing in with Google shares</h2><p className="text-sm leading-6 text-core-text-secondary">Clerk verifies your Google identity. WorkflowConnect receives and stores your verified email address, name, profile image URL, and Clerk user ID to identify your account.</p><p className="text-sm leading-6 text-core-text-secondary">Your Google password is never shared with WorkflowConnect. Signing in does not require access to your Gmail, Google Drive, contacts, or Calendar.</p><p className="text-xs leading-5 text-core-muted">If Google asks for access to those services, cancel and contact support before continuing.</p></section>
          <p className="flex items-start gap-2 text-xs leading-5 text-core-text-secondary"><LockKeyhole aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />{registering ? "Creating an account does not grant access to another business. Workspace access requires a verified membership." : "Already use another sign-in method? Use Clerk’s verification prompts to securely connect your methods."}</p>
          <LegalLinks /><Link href="/auth-help" className="inline-block text-xs text-core-accent underline underline-offset-4">Need help signing in or recovering an account?</Link>
        </section>
        <section aria-label={registering ? "Create a WorkflowConnect account" : "Sign in to WorkflowConnect"} className="min-w-0">{children}</section>
      </div>
    </div>
  </main>;
}
