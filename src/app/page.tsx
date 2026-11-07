import Link from "@/components/workspaces/SiteLink";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, CheckSquare, Receipt, Users } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { WorkspacePreview } from "@/components/marketing/WorkspacePreview";
import { canonicalOrigin } from "@/config/brand";

export const metadata: Metadata = {
  title: { absolute: "WorkflowConnect — Your business, connected." },
  ...(canonicalOrigin() ? { alternates: { canonical: "/" } } : {}),
};
const essentials = [
  { icon: Users, title: "Know your clients.", copy: "Keep contacts and the work behind each relationship together." },
  { icon: BriefcaseBusiness, title: "See the bigger picture.", copy: "Connect projects, budgets, and deadlines to your clients." },
  { icon: CheckSquare, title: "Keep work moving.", copy: "Give tasks a clear owner, priority, and next step." },
  { icon: Receipt, title: "Stay on top of billing.", copy: "Track invoice records alongside the work they belong to." },
];
export default function HomePage() {
  return <div className="marketing">
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-brand-deep p-4 text-white focus:not-sr-only">Skip to content</a>
    <SiteHeader ctaHref="/sign-in" ctaLabel="Get access"/>
    <main id="main-content">
      <section className="site-container grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[.95fr_1.05fr] lg:gap-10 lg:py-24">
        <div>
          <p className="site-eyebrow">YOUR BUSINESS, CONNECTED</p>
          <h1 className="mt-6 text-[clamp(3.25rem,6vw,5.3rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-brand-deep">Less juggling.<br/>More clarity<span className="text-[#398777]">.</span></h1>
          <p className="site-copy mt-7 max-w-lg !text-xl sm:!text-2xl">Clients, projects, tasks, and invoices.<br className="hidden sm:block"/> One place to bring it all together.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Link className="site-button" href="/sign-in">Get access<ArrowUpRight aria-hidden="true" size={20}/></Link><Link className="site-button site-button-secondary" href="/features">Explore features<ArrowRight aria-hidden="true" size={20}/></Link></div>
          <p className="mt-5 text-base leading-7 text-brand-muted">For freelancers, small teams, and service businesses.</p>
        </div>
        <WorkspacePreview/>
      </section>
      <section className="border-y border-brand-line bg-white">
        <div className="site-container site-section">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="site-eyebrow">EVERYDAY WORK. ONE WORKSPACE.</p><h2 className="site-title mt-4 max-w-xl">Everything in context.</h2></div><Link href="/features" className="inline-flex min-h-12 items-center gap-3 text-lg font-semibold text-brand-deep">See all features<ArrowUpRight aria-hidden="true" size={20}/></Link></div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{essentials.map(({icon:Icon,title,copy}) => <article key={title} className="border-t border-brand-line pt-7"><Icon aria-hidden="true" size={28} className="text-brand-deep"/><h3 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h3><p className="site-copy mt-4">{copy}</p></article>)}</div>
        </div>
      </section>
      <section id="how-it-works" className="bg-brand-deep text-white">
        <div className="site-container site-section"><p className="site-eyebrow !text-[#93DCC4]">A CLEAR START</p><h2 className="site-title mt-4">Make room for better work.</h2><div className="mt-12 grid gap-9 md:grid-cols-3">{[
          ["01", "Set up your business", "Create an account and your business workspace."],
          ["02", "Choose your plan", "Complete subscription review, verified payment, and activation."],
          ["03", "Bring work together", "Organize client work and invite your team on eligible plans."],
        ].map(([number,title,copy]) => <article key={number} className="border-t border-white/25 pt-6"><p className="text-base text-[#93DCC4]">{number}</p><h3 className="mt-5 text-2xl font-medium">{title}</h3><p className="mt-4 text-lg leading-8 text-[#C4D8CF]">{copy}</p></article>)}</div><p className="mt-9 text-base text-[#C4D8CF]">No automatic free trial. Business access begins after activation.</p></div>
      </section>
      <section className="site-container site-section">
        <div className="grid gap-8 rounded-3xl border border-brand-line bg-[#EFF3EC] p-8 sm:p-12 md:grid-cols-[1.4fr_1fr] md:items-center"><div><p className="site-eyebrow">ROOM TO GROW</p><h2 className="site-title mt-4">Your work. Your pace.</h2><p className="site-copy mt-5 max-w-xl">From a solo business to a growing team. Find the plan that fits.</p></div><div className="md:justify-self-end"><Link href="/pricing" className="site-button">Explore pricing<ArrowUpRight aria-hidden="true" size={20}/></Link></div></div>
      </section>
    </main>
    <SiteFooter/>
  </div>;
}
