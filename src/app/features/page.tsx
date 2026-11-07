import Link from "@/components/workspaces/SiteLink";
import type { Metadata } from "next";
import { ArrowUpRight, BriefcaseBusiness, CheckSquare, LayoutDashboard, Receipt, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { canonicalOrigin } from "@/config/brand";
export const metadata: Metadata = { title: "Features", description: "Clients, projects, tasks, invoices and team access in one business workspace.", ...(canonicalOrigin() ? { alternates: { canonical: "/features" } } : {}) };
const features = [
  { icon: Users, tag: "01 / CLIENTS", title: "A clear home for every client.", copy: "Keep client details, project relationships, and invoice records together. Find the context you need before the next conversation." },
  { icon: BriefcaseBusiness, tag: "02 / PROJECTS", title: "See where the work stands.", copy: "Keep project statuses, budgets, and deadlines in view. Connect delivery to the client and the tasks behind it." },
  { icon: CheckSquare, tag: "03 / TASKS", title: "Make responsibility clear.", copy: "Assign work, set priorities, and track progress. Staff see their authorized projects and assigned or explicitly team-visible tasks." },
  { icon: Receipt, tag: "04 / INVOICING", title: "Keep billing in the picture.", copy: "Create and manage invoicing records associated with your clients and projects. Financial information stays within owner permissions." },
  { icon: LayoutDashboard, tag: "05 / OVERSIGHT", title: "Know what needs attention.", copy: "Bring project status and outstanding work into a role-appropriate dashboard. Owners can also review permitted financial information." },
  { icon: ShieldCheck, tag: "06 / YOUR TEAM", title: "Bring people in thoughtfully.", copy: "After activation, eligible plans let owners invite team members and assign workspace roles. Memberships and assignments control access." },
];

export default function FeaturesPage() {
  return <div className="marketing min-h-screen">
    <SiteHeader ctaHref="/sign-in" ctaLabel="Get access"/>
    <main id="main-content" className="site-container site-section">
      <header className="max-w-3xl"><p className="site-eyebrow">THE WORK, CONNECTED</p><h1 className="site-title mt-5">Less switching.<br/>More moving forward.</h1><p className="site-copy mt-6">Your clients, delivery, and billing records. Together in one workspace.</p></header>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,tag,title,copy}) => <article key={tag} className="rounded-2xl border border-brand-line bg-white p-7"><Icon aria-hidden="true" size={28} className="text-brand-deep"/><p className="site-eyebrow mt-8">{tag.split(" / ")[1]}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2><p className="site-copy mt-4">{copy}</p></article>)}</div>
      <section className="mt-16 rounded-3xl bg-brand-deep p-8 text-white sm:p-12"><p className="site-eyebrow !text-[#93DCC4]">ACCESS THAT FITS YOUR ROLE</p><h2 className="mt-4 text-3xl font-semibold">One account. Separate businesses.</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-[#C4D8CF]">Workspace memberships and assignments control what each person can see. Financial information is restricted by role.</p><Link href="/pricing" className="mt-7 inline-flex min-h-12 items-center gap-3 text-lg font-semibold underline underline-offset-4">Find your plan<ArrowUpRight aria-hidden="true" size={20}/></Link></section>
      <aside className="mt-10 border-l-2 border-brand-line pl-6"><h2 className="text-xl font-semibold">Future client portal</h2><p className="site-copy mt-2">Post-MVP concept. Not available in the current product; no release date is promised.</p></aside>
    </main><SiteFooter/>
  </div>;
}
