"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Check,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Users,
  Building,
  Zap,
  X,
  Loader2,
} from "lucide-react";

type BillingType = "regular" | "beta";

interface Tier {
  id: string;
  name: string;
  target: string;
  regularPrice: string;
  betaPrice: string;
  features: string[];
  ctaText: string;
  isPopular?: boolean;
  icon: React.ComponentType<any>;
}

const tiers: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    target: "Solo Freelancers",
    regularPrice: "$19/mo",
    betaPrice: "Ksh 0 / Beta Access",
    icon: Zap,
    features: [
      "1 User Workspace",
      "Up to 5 Active Projects",
      "Invoice Generation & Status Logs",
      "Basic Operational Dashboard",
      "Email Support",
    ],
    ctaText: "Launch Starter Sandbox",
  },
  {
    id: "studio",
    name: "Studio",
    target: "Small Agencies",
    regularPrice: "$49/mo",
    betaPrice: "Coming Soon (Waitlist)",
    icon: Users,
    isPopular: true,
    features: [
      "2 - 5 Users (Team seats)",
      "Unlimited Projects & Tasks",
      "Advanced Workspace Activity Feeds",
      "Dedicated Client Portals",
      "Priority Invoicing & Revenue Analytics",
      "Standard Priority Support",
    ],
    ctaText: "Join Studio Waitlist",
  },
  {
    id: "growth",
    name: "Growth",
    target: "Scaling Agencies",
    regularPrice: "$99/mo",
    betaPrice: "Coming Soon (Waitlist)",
    icon: Building,
    features: [
      "Multi-workspace Management",
      "Custom Agency Branding",
      "Custom Domains & SSL Client Portals",
      "Priority 24/7 Slack & Email Support",
      "API Access & Custom Integrations",
      "Dedicated Onboarding Specialist",
    ],
    ctaText: "Join Growth Waitlist",
  },
];

export default function PricingPage() {
  const [billingMode, setBillingMode] = useState<BillingType>("beta");
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  
  // Lead capture form state
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("2-5");
  const [bottleneck, setBottleneck] = useState("context-switching");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleOpenWaitlist = (tier: Tier) => {
    if (tier.id === "starter") {
      // Direct link to launch sandbox
      window.location.href = "/demo?launch=true";
      return;
    }
    setSelectedTier(tier);
    setIsSubmitted(false);
    setEmail("");
  };

  const handleCloseModal = () => {
    setSelectedTier(null);
  };

  const handleSubmitWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);

    // Simulate saving lead to CRM / localStorage
    setTimeout(() => {
      const lead = {
        email,
        tier: selectedTier?.name,
        teamSize,
        bottleneck,
        submittedAt: new Date().toISOString(),
      };
      
      const existingLeads = JSON.parse(localStorage.getItem("coreops_waitlist_leads") || "[]");
      existingLeads.push(lead);
      localStorage.setItem("coreops_waitlist_leads", JSON.stringify(existingLeads));

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B101D] font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute right-[-10%] top-[30%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[50%] w-[50%] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      {/* Landing Header */}
      <header className="relative z-40 w-full border-b border-[#232D42] bg-[#0B101D]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                CoreOps
              </span>
              <span className="-mt-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Studio
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Home
            </Link>
            <Link href="/demo" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Demo Page
            </Link>
            <span className="h-4 w-px bg-[#232D42]" />
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              Early Access Beta Open
            </span>
          </nav>

          <div>
            <Link
              href="/demo?launch=true"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
            >
              Try Live Sandbox
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:py-24">
        
        {/* Page title header */}
        <section className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 shadow-inner mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Outcomes-driven Agency Dashboard</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl md:leading-[1.1]">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              pricing tiers.
            </span>
          </h1>

          <p className="mt-6 text-base text-slate-300 sm:text-lg max-w-xl mx-auto leading-relaxed">
            Validate CoreOps workflows inside your studio. Boot the live sandbox or secure your early waitlist access for agency-grade features.
          </p>

          {/* Early Access Toggle */}
          <div className="mt-12 flex justify-center">
            <div className="relative flex items-center bg-[#161C2A]/60 p-1 rounded-2xl border border-[#232D42]">
              <button
                type="button"
                onClick={() => setBillingMode("beta")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 ${
                  billingMode === "beta"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Beta Early Access</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                  Ksh 0
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingMode("regular")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                  billingMode === "regular"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Regular Subscription
              </button>
            </div>
          </div>
        </section>

        {/* TIERS GRID ARCHITECTURE */}
        <section className="grid md:grid-cols-3 gap-8 items-stretch mb-20 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const TierIcon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-[#161C2A]/40 p-6 sm:p-8 transition-all duration-300 ${
                  tier.isPopular
                    ? "border-blue-500/40 shadow-[0_0_35px_rgba(59,130,246,0.06)] bg-[#161C2A]/80 ring-1 ring-blue-500/15 scale-102 z-10"
                    : "border-[#232D42] hover:border-slate-700/60 hover:shadow-xl"
                }`}
              >
                {/* Popular Ribbon */}
                {tier.isPopular && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <div>
                  {/* Tier Title */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        {tier.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        {tier.target}
                      </p>
                    </div>

                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      tier.isPopular
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        : "bg-slate-800/40 border-slate-800 text-slate-400"
                    }`}>
                      <TierIcon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Pricing representation */}
                  <div className="my-6 border-b border-[#232D42]/60 pb-6">
                    {billingMode === "beta" ? (
                      <div>
                        {/* Crossed out regular price */}
                        <span className="text-sm text-slate-500 line-through font-mono">
                          {tier.regularPrice}
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white tracking-tight sm:text-3xl">
                            {tier.betaPrice}
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1 font-semibold">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          Beta Early Access terms applied
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white tracking-tight sm:text-4xl">
                            {tier.regularPrice}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Standard agency subscription model
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Feature Lists */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Features</h4>
                    <ul className="space-y-3.5 text-xs text-slate-300">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-normal">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                            tier.isPopular
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="mt-8 pt-6 border-t border-[#232D42]/60">
                  <button
                    onClick={() => handleOpenWaitlist(tier)}
                    className={`flex h-12 w-full items-center justify-center rounded-xl text-xs font-extrabold transition-all duration-300 ${
                      tier.id === "starter"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow shadow-blue-500/10 hover:scale-[1.02]"
                        : tier.isPopular
                        ? "bg-[#232D42] hover:bg-blue-500/10 text-indigo-300 hover:text-blue-400 border border-indigo-500/20"
                        : "bg-[#161C2A] hover:bg-[#232D42] text-slate-300 hover:text-white border border-[#232D42]"
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* FAQs SECURE LOGS */}
        <section className="border-t border-[#232D42]/40 pt-16 max-w-4xl mx-auto">
          <h2 className="text-center text-xs font-bold uppercase tracking-wider text-blue-500 mb-8">Frequently Asked Questions</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-slate-300 text-xs">
            <div className="bg-[#161C2A]/30 border border-[#232D42] p-5 rounded-2xl">
              <h4 className="font-bold text-white mb-2">How long is early beta access free?</h4>
              <p className="leading-relaxed text-slate-400">
                Early beta access to the Starter plan is free for the duration of our initial testing cycle. No credit card information is required to try the sandbox or register details.
              </p>
            </div>
            <div className="bg-[#161C2A]/30 border border-[#232D42] p-5 rounded-2xl">
              <h4 className="font-bold text-white mb-2">Can I connect my own databases in early access?</h4>
              <p className="leading-relaxed text-slate-400">
                Yes, after checking out the read-only sandbox, you can configure your own workspace and input custom client logs, projects, tasks, and invoice reports.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#232D42]/60 bg-[#0A0E1A] px-6 py-12 text-xs text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="flex items-center gap-2 text-slate-300">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold tracking-tight text-white">
              CoreOps Studio
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium md:gap-8">
            <Link href="/" className="transition hover:text-slate-300">Home</Link>
            <Link href="/demo" className="transition hover:text-slate-300">Demo Page</Link>
            <Link href="/demo?launch=true" className="font-bold text-blue-400 transition hover:text-blue-300">
              Launch Sandbox
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} CoreOps Studio. All rights reserved.
          </div>
        </div>
      </footer>

      {/* WAITLIST LEAD CAPTURE MODAL POPUP */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B101D]/90 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-[#232D42] bg-[#161C2A]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleSubmitWaitlist}>
                {/* Form Header */}
                <div className="mb-6">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
                    <Building className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Join {selectedTier.name} Waitlist
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your operational details below to secure priority access to our agency-grade tools.
                  </p>
                </div>

                {/* Form Inputs */}
                <div className="space-y-4 text-xs">
                  {/* Work Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="waitlist-email" className="font-semibold text-slate-300">
                      Work Email Address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@youragency.com"
                      className="h-10 w-full rounded-xl border border-[#232D42] bg-[#0B101D] px-3.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Team Size */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">
                      How many team members are in your agency?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "1 seat", val: "1" },
                        { label: "2-5", val: "2-5" },
                        { label: "6-10", val: "6-10" },
                        { label: "11+", val: "11+" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setTeamSize(item.val)}
                          className={`h-9 rounded-lg border text-[10px] font-bold transition-all ${
                            teamSize === item.val
                              ? "bg-blue-600/10 border-blue-500/60 text-blue-400"
                              : "bg-[#0B101D] border-[#232D42] text-slate-400 hover:text-slate-200 hover:border-slate-800"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Biggest operational pain point */}
                  <div className="space-y-1.5">
                    <label htmlFor="waitlist-bottleneck" className="font-semibold text-slate-300">
                      What is your biggest operational bottleneck?
                    </label>
                    <select
                      id="waitlist-bottleneck"
                      value={bottleneck}
                      onChange={(e) => setBottleneck(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#232D42] bg-[#0B101D] px-3.5 text-xs text-slate-300 outline-none transition focus:border-blue-500"
                    >
                      <option value="context-switching">Context switching between too many tools</option>
                      <option value="missed-deadlines">Missed task deadlines & project delivery gaps</option>
                      <option value="billing-visibility">Invoicing delays & financial metrics blind spots</option>
                      <option value="client-relations">Scattered client communications & notes</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Secure My Waitlist Slot"
                  )}
                </button>
              </form>
            ) : (
              /* Success State */
              <div className="text-center py-6 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  You're on the list!
                </h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                  We've successfully registered your work email <span className="text-blue-400 font-semibold">{email}</span> for early access to the <span className="text-indigo-400 font-bold">{selectedTier.name}</span> beta.
                </p>
                <p className="text-[11px] text-slate-400 mt-3 max-w-xs leading-relaxed">
                  We will contact you with keys and instructions as soon as team capacity allocations open up.
                </p>

                <button
                  onClick={handleCloseModal}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#232D42] hover:bg-[#2d3a58] px-6 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
