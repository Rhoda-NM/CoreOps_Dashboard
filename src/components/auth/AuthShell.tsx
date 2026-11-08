import Link from "@/components/workspaces/SiteLink";
import { Brand } from "@/components/brand/Brand";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCheck, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { LegalLinks } from "./LegalLinks";

export function AuthShell({ children, registering = false }: { children: ReactNode; registering?: boolean }) {
  return <main className="auth-page min-h-screen bg-brand-warm px-5 py-6 text-brand-ink sm:px-8 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between gap-5">
        <Link href="/" aria-label="WorkflowConnect home" className="inline-flex rounded-lg"><Brand /></Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-muted hover:text-brand-deep"><ArrowLeft aria-hidden="true" size={16}/><span className="hidden sm:inline">Back to website</span><span className="sm:hidden">Home</span></Link>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:mt-12 lg:grid-cols-[1fr_440px] lg:gap-16">
        <section aria-labelledby="auth-welcome-heading" className="auth-intro relative isolate overflow-hidden rounded-3xl bg-brand-deep px-7 py-7 text-white sm:px-10 sm:py-10 lg:sticky lg:top-8 lg:flex lg:min-h-[650px] lg:flex-col lg:justify-between lg:px-12 lg:py-14">
          <div className="relative max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#A5E3CE]">Your business, connected.</p>
            <h1 id="auth-welcome-heading" className="mt-6 text-3xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[3.5rem]">{registering ? <>Make space for<br/>better work.</> : <>Good to have<br/>you back.</>}</h1>
            <p className="mt-5 max-w-xs text-lg leading-8 text-[#D1E4DB]"><span className="sm:hidden">{registering ? "Your work, in one place." : "Pick up where you left off."}</span><span className="hidden sm:inline">{registering ? "A simpler home for your clients, projects, and team." : "Less juggling. More clarity. Pick up where your work left off."}</span></p>
          </div>

          <div aria-hidden="true" className="relative my-14 hidden rounded-2xl border border-white/15 bg-white/[.05] p-6 lg:block">
            <p className="mb-6 text-sm font-medium text-[#D1E4DB]">Everything in its place.</p>
            <div className="flex items-center justify-between gap-2">
              {[{ icon: Users, label: "Clients" }, { icon: BriefcaseBusiness, label: "Projects" }, { icon: CheckCheck, label: "Tasks" }].map(({ icon: Icon, label }, index) => <div key={label} className="contents"><div className="flex flex-col items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#1F514B] text-[#BCEBDD]"><Icon size={21}/></span><span className="text-xs text-[#D1E4DB]">{label}</span></div>{index < 2 && <span className="mb-7 h-px flex-1 bg-white/20"/>}</div>)}
            </div>
          </div>

          <p className="relative mt-8 hidden items-center lg:flex gap-3 text-sm leading-6 text-[#D1E4DB]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><ShieldCheck aria-hidden="true" size={17}/></span>One account. Your workspaces.</p>
        </section>

        <section aria-label={registering ? "Create a WorkflowConnect account" : "Sign in to WorkflowConnect"} className="min-w-0 lg:py-3">
          <div className="auth-form">{children}</div>
          <p className="mt-6 text-center text-sm leading-6 text-brand-muted">Need a hand? <Link href="/auth-help" className="inline-flex items-center gap-1 font-semibold text-[#11675D] underline decoration-[#B5C7BE] underline-offset-4 hover:decoration-[#11675D]">Account help<ArrowRight aria-hidden="true" size={14}/></Link></p>

          <section aria-labelledby="google-privacy-heading" className="mt-8 border-t border-brand-line pt-6">
            <h2 id="google-privacy-heading" className="flex items-center gap-2 text-sm font-semibold text-brand-deep"><ShieldCheck aria-hidden="true" size={16}/>Your Google data, explained</h2>
            <p className="mt-2 text-sm leading-6 text-brand-muted">We store your verified email address, name, profile image URL, and Clerk user ID to identify your account.</p>
            <details className="mt-3 text-sm leading-6 text-brand-muted"><summary className="w-fit cursor-pointer rounded-sm font-medium text-[#11675D] underline decoration-[#B5C7BE] underline-offset-4">What stays private</summary><div className="mt-3 space-y-3"><p>Clerk verifies your identity. Your Google password is never shared with WorkflowConnect. Signing in does not require access to your Gmail, Google Drive, contacts, or Calendar.</p><p>If Google asks for access to those services, cancel and contact support before continuing.</p><p>{registering ? "An account does not grant access to another business. Join through an invitation or set up your own workspace." : "Use Clerk’s verification prompts to securely connect another sign-in method. Your role stays separate in each workspace."}</p></div></details>
          </section>
        </section>
      </div>
      <footer className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-brand-line py-6 text-sm text-brand-muted sm:flex-row"><p>A product by Stravect Systems.</p><LegalLinks tone="light" /></footer>
    </div>
  </main>;
}
