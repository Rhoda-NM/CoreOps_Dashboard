"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Users,
  CheckSquare,
  Receipt,
  Activity,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Layers,
  ChevronRight,
  Mail,
  Check,
} from "lucide-react";

type Hotspot = "revenue" | "overdue" | null;

const navLinks = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#preview" },
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#audience" },
  { label: "Pricing", href: "/pricing" },
];

const problemCards = [
  {
    title: "Context Switching",
    description:
      "Losing hours moving between task boards, spreadsheets, invoices, email, and client messages breaks focus and slows agency momentum.",
    icon: Layers,
  },
  {
    title: "Dropped Balls",
    description:
      "Deadlines slip when tasks are buried in old chat threads and project details live across scattered tools.",
    icon: CheckSquare,
  },
  {
    title: "Financial Blind Spots",
    description:
      "Without a clear view of paid revenue, outstanding invoices, and overdue work, growth becomes reactive instead of controlled.",
    icon: TrendingUp,
  },
];

const featureCards = [
  {
    title: "Client Management",
    description:
      "Keep client records, contact details, project history, and relationship status in one organized workspace.",
    icon: Users,
    label: "workspace.clients",
  },
  {
    title: "Project & Task Tracking",
    description:
      "Create projects, track task status, flag overdue work, monitor priorities, and keep execution moving across every client.",
    icon: CheckSquare,
    label: "workspace.tasks",
  },
  {
    title: "Invoicing & Revenue Visibility",
    description:
      "Create invoices, link them to clients or projects, update payment status, and track paid revenue versus outstanding balances.",
    icon: Receipt,
    label: "workspace.billing",
  },
  {
    title: "Workspace Activity",
    description:
      "Review recent projects, tasks, invoices, and operational updates from one central place as your workspace grows.",
    icon: Activity,
    label: "workspace.activity",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot>(null);

  function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) return;

    setIsSubmitted(true);
    setEmail("");

    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B101D] font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute right-[-10%] top-[30%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[50%] w-[50%] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-[#232D42] bg-[#0B101D]/80 backdrop-blur-xl">
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
            {navLinks.map((item) => {
              if (item.href.startsWith("#")) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/demo"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500"
            >
              View Demo
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#232D42] bg-[#161C2A] text-slate-300 transition-colors hover:bg-[#232D42] hover:text-white md:hidden"
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex w-5 flex-col gap-1">
              <span
                className={`h-0.5 w-full bg-current transition-transform ${
                  mobileMenuOpen ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-opacity ${
                  mobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-transform ${
                  mobileMenuOpen ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-b border-[#232D42] bg-[#161C2A] px-6 py-6 md:hidden">
            <nav className="flex flex-col gap-4">
              {navLinks.map((item) => {
                if (item.href.startsWith("#")) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium text-slate-300 hover:text-white"
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-slate-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-[#232D42] pt-4">
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                View Demo
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="relative px-6 pb-24 pt-20 sm:px-8 md:pb-36 md:pt-28">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#232D42] bg-[#161C2A] px-4 py-1.5 text-xs font-semibold text-blue-400 shadow-inner">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Unified Agency Command Center</span>
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl md:leading-[1.08] lg:text-7xl">
              The command center for your{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                agency operations.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-xl">
              CoreOps brings your clients, projects, tasks, invoices, and revenue
              into one focused workspace — so you always know what needs
              attention next.
            </p>

            <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
              <Link
                href="/demo"
                className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] sm:w-auto"
              >
                View Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <a
                href="#early-access"
                className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-[#232D42] bg-[#161C2A]/70 px-8 text-base font-semibold text-slate-200 transition-all hover:bg-[#232D42] hover:text-white active:scale-[0.98] sm:w-auto"
              >
                Join Early Access
              </a>
            </div>

            <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-8 border-t border-[#232D42]/60 pt-8 text-sm text-slate-400 md:grid-cols-3">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white">
                  One
                </span>
                <span>Unified Workspace</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white">
                  Faster
                </span>
                <span>Operational Reviews</span>
              </div>

              <div className="col-span-2 flex flex-col items-center md:col-span-1">
                <span className="text-2xl font-extrabold text-white">
                  Clear
                </span>
                <span>Revenue Visibility</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="problem"
          className="relative border-t border-[#232D42]/40 bg-[#0B101D]/60 px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-500">
                The Operational Mess
              </h2>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Running an agency should not feel like wrestling chaos.
              </p>

              <p className="mt-4 text-base text-slate-400">
                Small teams lose hours every week switching between
                spreadsheets, task boards, invoices, chat threads, and
                disconnected client notes.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {problemCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="group rounded-2xl border border-[#232D42] bg-[#161C2A]/60 p-8 transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.05)]"
                  >
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-lg font-bold text-white transition-colors group-hover:text-red-400">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="preview"
          className="relative border-t border-[#232D42]/40 bg-[#0B101D] px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                The Solution
              </h2>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                One command center for the work that keeps your agency moving.
              </p>

              <p className="mt-4 text-base text-slate-400">
                CoreOps turns scattered business operations into a structured
                workflow powered by real client, task, invoice, and project data.
              </p>
            </div>

            <div className="group relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#232D42] bg-[#161C2A] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#232D42]/80 bg-[#0B101D] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="inline-block h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>

                <div className="flex w-72 max-w-full items-center justify-between gap-2 rounded-md border border-[#232D42]/50 bg-[#161C2A] px-6 py-1 font-mono text-[10px] text-slate-400">
                  <span>coreops.studio/dashboard</span>
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                </div>

                <div className="w-12" />
              </div>

              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0F172A]">
                <Image
                  src="/dashboard.png"
                  alt="CoreOps dashboard preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority
                  className="select-none object-cover object-top transition-transform duration-700 group-hover:scale-[1.005]"
                />

                <div className="absolute inset-0 bg-[#0B101D]/15 transition-opacity group-hover:bg-[#0B101D]/10" />

                <div
                  className="absolute"
                  style={{ top: "73%", left: "41%" }}
                  onMouseEnter={() => setActiveHotspot("overdue")}
                  onMouseLeave={() => setActiveHotspot(null)}
                >
                  <span className="pointer-events-none absolute -inset-3 flex h-10 w-10 items-center justify-center rounded-full">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-red-500/40 opacity-75" />
                    <span className="relative h-4 w-4 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
                  </span>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveHotspot(
                        activeHotspot === "overdue" ? null : "overdue"
                      );
                    }}
                    className="relative z-10 h-4 w-4 cursor-pointer rounded-full border border-white bg-red-500 focus:outline-none"
                  />

                  <div
                    className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-4 w-64 -translate-x-1/2 rounded-xl border border-[#232D42] bg-[#161C2A] p-4 shadow-2xl transition-all duration-300 ${
                      activeHotspot === "overdue"
                        ? "translate-y-0 scale-100 opacity-100"
                        : "translate-y-2 scale-95 opacity-0"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      <span>Overdue task detection</span>
                    </div>

                    <h4 className="mb-1 text-sm font-bold text-white">
                      Prevent missed deadlines
                    </h4>

                    <p className="text-xs leading-normal text-slate-300">
                      CoreOps highlights tasks that are past their due dates so
                      urgent client work stays visible.
                    </p>

                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-[#161C2A]" />
                  </div>
                </div>

                <div
                  className="absolute"
                  style={{ top: "73%", left: "55%" }}
                  onMouseEnter={() => setActiveHotspot("revenue")}
                  onMouseLeave={() => setActiveHotspot(null)}
                >
                  <span className="pointer-events-none absolute -inset-3 flex h-10 w-10 items-center justify-center rounded-full">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-blue-500/40 opacity-75" />
                    <span className="relative h-4 w-4 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
                  </span>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveHotspot(
                        activeHotspot === "revenue" ? null : "revenue"
                      );
                    }}
                    className="relative z-10 h-4 w-4 cursor-pointer rounded-full border border-white bg-blue-500 focus:outline-none"
                  />

                  <div
                    className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-4 w-64 -translate-x-1/2 rounded-xl border border-[#232D42] bg-[#161C2A] p-4 shadow-2xl transition-all duration-300 ${
                      activeHotspot === "revenue"
                        ? "translate-y-0 scale-100 opacity-100"
                        : "translate-y-2 scale-95 opacity-0"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                      <span>Revenue visibility</span>
                    </div>

                    <h4 className="mb-1 text-sm font-bold text-white">
                      Track paid and outstanding invoices
                    </h4>

                    <p className="text-xs leading-normal text-slate-300">
                      Dashboard metrics are calculated from invoice status, so
                      paid revenue and outstanding balances stay visible.
                    </p>

                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-[#161C2A]" />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center font-mono text-sm text-slate-400">
              ⚡ Hover over pulse nodes to inspect the operational signals.
            </p>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-[#232D42]/40 bg-[#0B101D]/60 px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Product Pillars
              </h2>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Four pillars. Zero friction.
              </p>

              <p className="mt-4 text-base text-slate-400">
                CoreOps brings the critical pillars of small agency operations
                into one highly focused workspace.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-[#232D42] bg-[#161C2A] p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.05)]"
                  >
                    <div>
                      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </div>

                      <h3 className="text-base font-bold text-white transition-colors group-hover:text-blue-400">
                        {feature.title}
                      </h3>

                      <p className="mt-3 text-xs leading-relaxed text-slate-300">
                        {feature.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#232D42]/50 pt-4 font-mono text-[11px] text-slate-400 group-hover:text-white">
                      <span>{feature.label}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="audience"
          className="border-t border-[#232D42]/40 bg-[#0B101D] px-6 py-24 sm:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Use Cases
              </h2>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Built for freelancers, studios, and lean agency teams.
              </p>

              <p className="mt-4 text-base text-slate-400">
                CoreOps is designed for service businesses that have outgrown
                scattered spreadsheets but do not need heavyweight enterprise
                software.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-[#232D42] bg-[#161C2A]/60 p-8 transition-all hover:bg-[#161C2A] md:p-10">
                <div>
                  <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                    <Zap className="h-3 w-3" />
                    <span>Independent Creator</span>
                  </div>

                  <h3 className="mb-4 text-xl font-bold text-white md:text-2xl">
                    Solo Freelancers
                  </h3>

                  <p className="mb-6 text-sm leading-relaxed text-slate-300">
                    Keep your client work organized, professional, and
                    financially visible without building a complicated internal
                    system.
                  </p>

                  <ul className="space-y-3.5 text-xs font-medium text-slate-300">
                    {[
                      "Manage every client relationship in one place",
                      "Track projects, tasks, and overdue work",
                      "See paid revenue and outstanding invoices clearly",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Link
                    href="/demo"
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-[#232D42] text-sm font-semibold text-slate-200 transition-all hover:bg-[#2e3b56] hover:text-white"
                  >
                    Launch Personal Demo
                  </Link>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#232D42] bg-[#161C2A]/60 p-8 transition-all hover:bg-[#161C2A] md:p-10">
                <div>
                  <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400">
                    <BriefcaseBusiness className="h-3 w-3" />
                    <span>Lean Agency Team</span>
                  </div>

                  <h3 className="mb-4 text-xl font-bold text-white md:text-2xl">
                    Small Digital Agencies
                  </h3>

                  <p className="mb-6 text-sm leading-relaxed text-slate-300">
                    Bring client operations, project execution, task visibility,
                    and invoice tracking into one command center.
                  </p>

                  <ul className="space-y-3.5 text-xs font-medium text-slate-300">
                    {[
                      "View all active projects across clients",
                      "Track urgent and overdue work before it slips",
                      "Monitor outstanding invoices and monthly revenue",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Link
                    href="/demo"
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:from-blue-500 hover:to-indigo-500"
                  >
                    Launch Agency Demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="early-access"
          className="relative border-t border-[#232D42]/40 bg-gradient-to-b from-[#0B101D] to-[#0A0E1A] px-6 py-24 sm:px-8"
        >
          <div className="relative mx-auto flex max-w-4xl flex-col items-center overflow-hidden rounded-3xl border border-[#232D42] bg-gradient-to-br from-[#161C2A] to-[#0F1422] p-8 text-center shadow-2xl md:p-16">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-[-20%] top-[-50%] h-[80%] w-[80%] rounded-full bg-blue-600/5 blur-[120px]" />
              <div className="absolute bottom-[-50%] right-[-20%] h-[80%] w-[80%] rounded-full bg-indigo-600/5 blur-[120px]" />
            </div>

            <div className="relative z-10 flex max-w-2xl flex-col items-center">
              <h2 className="text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                Ready to run a cleaner, more controlled agency?
              </h2>

              <p className="mt-6 text-sm leading-relaxed text-slate-300 md:text-base">
                Join early access to test CoreOps, share feedback, and help
                shape the next version for freelancers and small digital
                agencies.
              </p>

              <form
                onSubmit={handleSubscribe}
                className="relative mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row"
              >
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your work email"
                    className="h-12 w-full rounded-xl border border-[#232D42] bg-[#0B101D] pl-11 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitted}
                  className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-80"
                >
                  {isSubmitted ? (
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      Saved
                    </span>
                  ) : (
                    "Join Early Access"
                  )}
                </button>
              </form>

              {isSubmitted && (
                <p className="mt-3 text-xs font-medium text-emerald-400">
                  Thank you — your interest has been saved.
                </p>
              )}

              <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                <span>Want to test drive first?</span>
                <Link
                  href="/demo"
                  className="group inline-flex items-center gap-1 font-bold text-blue-400 transition-colors hover:text-blue-300"
                >
                  Launch Interactive Demo
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

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
            <a
              href="#problem"
              className="transition-colors hover:text-slate-300"
            >
              Problem
            </a>
            <a
              href="#preview"
              className="transition-colors hover:text-slate-300"
            >
              Solution
            </a>
            <a
              href="#features"
              className="transition-colors hover:text-slate-300"
            >
              Features
            </a>
            <Link
              href="/pricing"
              className="transition-colors hover:text-slate-300"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="font-bold text-blue-400 transition-colors hover:text-blue-300"
            >
              Launch Demo
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} CoreOps Studio. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}