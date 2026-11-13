import type { Metadata } from "next";
import Link from "@/components/workspaces/SiteLink";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Pricing } from "@/components/marketing/Pricing";
import { marketingContent } from "@/server/commercial/marketing";
import { canonicalOrigin } from "@/config/brand";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "Monthly and annual plans for freelancers, small teams, and growing service businesses.", ...(canonicalOrigin() ? { alternates: { canonical: "/pricing" } } : {}) };
const questions = [
  ["What counts as a member?", "Everyone with a workspace membership, including the owner. Pending invitations reserve seats; suspended members retain their seat."],
  ["How do I get started?", "Sign in or create your account, set up your workspace, and choose a plan. Standard plans use a server-priced quotation and independent payment verification. Negotiated subscriptions may require review."],
  ["How do renewals work?", "Renewals are manual. You can request your next monthly or annual period before the current one ends."],
  ["Can I add my team on Solo?", "Solo is for one owner. Choose Starter or Business for team invitations. A plan change takes effect only after review and activation."],
];
export default async function PricingPage() {
  const content = await marketingContent();
  return <div className="marketing min-h-screen"><SiteHeader ctaHref={content.ctaHref} ctaLabel={content.ctaLabel}/>
    <main id="main-content" className="site-container pb-20 pt-16 sm:pt-20">
      <header className="mx-auto mb-10 max-w-3xl text-center"><p className="site-eyebrow">A LITTLE CLARITY GOES A LONG WAY</p><h1 className="site-title mt-5">The right space<br/>for your business.</h1><p className="site-copy mx-auto mt-6 max-w-xl">Start on your own. Make room for your team.<br className="hidden sm:block"/> Keep your work connected at every stage.</p></header>
      <Pricing content={content}/>
      <section className="mt-20 grid gap-10 border-t border-brand-line pt-14 lg:grid-cols-[.8fr_1.2fr]"><div><p className="site-eyebrow">GOOD TO KNOW</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">A few clear answers.</h2><Link href="/features" className="mt-6 inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-brand-deep">Explore the features<ArrowUpRight aria-hidden="true" size={18}/></Link></div><div>{questions.map(([question,answer]) => <details key={question} className="border-b border-brand-line py-5 first:pt-0"><summary className="cursor-pointer text-lg font-semibold">{question}</summary><p className="site-copy mt-3">{answer}</p></details>)}</div></section>
    </main><SiteFooter/></div>;
}
