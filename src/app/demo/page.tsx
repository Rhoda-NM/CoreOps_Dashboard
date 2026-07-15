"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseBusiness,
  Users,
  CheckSquare,
  Receipt,
  Activity,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Maximize2,
  Video,
  Image as ImageIcon,
  Quote,
  X,
  ChevronRight,
  Monitor,
  Check,
  Loader2,
  HelpCircle,
  Volume2,
} from "lucide-react";

interface Step {
  id: number;
  label: string;
  status: "pending" | "loading" | "completed";
}

type TourTab = "crm" | "projects" | "tasks" | "invoices";

interface Hotspot {
  x: string; // Percentage from left
  y: string; // Percentage from top
  title: string;
  description: string;
}

const tabData: Record<
  TourTab,
  {
    title: string;
    highlights: string[];
    valueText: string;
    screenshot: string;
    hotspots: Hotspot[];
  }
> = {
  crm: {
    title: "Client CRM Management",
    highlights: [
      "Keep all client contact records, company profiles, and statuses in one view.",
      "See financial value and active projects per client instantly."
    ],
    valueText: "A unified system of record for your business relationships. Link every contact to their active projects, tasks, and historical billing statements.",
    screenshot: "/screenshots/clients.png",
    hotspots: [
      {
        x: "15%",
        y: "32%",
        title: "Client Workspace Hub",
        description: "List of all active and archived client relationships. Click to drill down into project logs and invoice history."
      },
      {
        x: "72%",
        y: "40%",
        title: "Real-time Contact Status",
        description: "Direct status badges showing who is actively being billed and who is on hold."
      }
    ]
  },
  projects: {
    title: "Project Command Center",
    highlights: [
      "Track active, paused, or completed delivery deliverables in one place.",
      "Monitor allocated project budgets directly against invoice generation."
    ],
    valueText: "Command your active service delivery from one screen. View project health, deadline countdowns, and allocated budgets in real-time.",
    screenshot: "/screenshots/projects.png",
    hotspots: [
      {
        x: "20%",
        y: "28%",
        title: "Project Deliverables Grid",
        description: "Review active, paused, and completed projects. See client link and budget allocated for each project."
      },
      {
        x: "55%",
        y: "45%",
        title: "Budget & Revenue Alignment",
        description: "Visualizes the budget assigned to each project to ensure operational targets are met."
      }
    ]
  },
  tasks: {
    title: "Operational Task Backlog",
    highlights: [
      "Track task priorities (Urgent, High, Medium, Low) and due dates.",
      "Proactive alerts highlight overdue client work in red automatically."
    ],
    valueText: "Keep execution moving with a centralized operational backlog. Track task priorities, assignees, and due dates across all active client projects.",
    screenshot: "/screenshots/tasks.png",
    hotspots: [
      {
        x: "28%",
        y: "30%",
        title: "Task Priority Matrix",
        description: "Urgent and High priority levels flag what tasks require immediate attention from your team."
      },
      {
        x: "82%",
        y: "48%",
        title: "Overdue Date Alert",
        description: "Due dates turn red and trigger notifications when a task remains incomplete past its deadline."
      }
    ]
  },
  invoices: {
    title: "Invoicing & Revenue Tracker",
    highlights: [
      "Monitor paid invoices vs outstanding balances dynamically.",
      "Automated invoice state tracking (Draft, Sent, Paid, Overdue)."
    ],
    valueText: "Track paid vs outstanding balances dynamically. CoreOps automates invoice creation and flags overdue billing so cash flow is always transparent.",
    screenshot: "/screenshots/invoices.png",
    hotspots: [
      {
        x: "18%",
        y: "25%",
        title: "Invoice Number Tracking",
        description: "Unique system-generated invoice identifiers mapped directly to individual clients."
      },
      {
        x: "75%",
        y: "38%",
        title: "Payment State Badges",
        description: "Instantly check whether invoices are Paid, Sent, Overdue, or Draft. Counts update dashboard metrics automatically."
      }
    ]
  }
};

const videoChapters = [
  { id: 0, title: "1. Command Center Overview", duration: "0:25", description: "Learn how the main dashboard calculates clients, active projects, and outstanding invoices.", image: "/dashboard.png" },
  { id: 1, title: "2. Navigating Client CRM", duration: "0:40", description: "See how clients are registered and associated with active projects.", image: "/screenshots/clients.png" },
  { id: 2, title: "3. Handling Active Tasks", duration: "0:35", description: "Create tasks, set priorities, and see how overdue tags trigger dashboards alerts.", image: "/screenshots/tasks.png" },
  { id: 3, title: "4. Creating & Mapped Invoices", duration: "0:50", description: "Generate invoices, update status to PAID, and watch revenue metrics grow.", image: "/screenshots/invoices.png" },
];

const testimonials = [
  {
    quote: "We consolidated three separate SaaS tools into CoreOps and reduced task context switching for our 4-person design agency by 80%.",
    author: "Dancan N.",
    role: "Creative Director at PixelMinds",
  },
  {
    quote: "The read-only sandbox let us verify the invoicing and project dashboard workflows instantly. We joined early access the same day.",
    author: "Joy W.",
    role: "Founder at Savannah Studio",
  },
  {
    quote: "Invoicing clients and seeing monthly revenue in Kenya Shillings in one dashboard solved a major operational headache for our agency.",
    author: "Mark K.",
    role: "Co-founder at Nairobi Digital",
  },
];

const screenshots = [
  { path: "/dashboard.png", title: "Operational Dashboard" },
  { path: "/screenshots/clients.png", title: "Client Directory" },
  { path: "/screenshots/client-detail.png", title: "Client Profile & Operations" },
  { path: "/screenshots/projects.png", title: "Project Deliverables" },
  { path: "/screenshots/project-detail.png", title: "Project Task Management" },
  { path: "/screenshots/tasks.png", title: "Active Tasks Backlog" },
  { path: "/screenshots/invoices.png", title: "Invoices & Revenue" },
];

export default function DemoPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeTab, setActiveTab] = useState<TourTab>("crm");
  const [activeHotspot, setActiveHotspot] = useState<{ tab: TourTab; index: number } | null>(null);

  // Walkthrough tabs: video, screenshots, testimonials
  const [activeSubTab, setActiveSubTab] = useState<"video" | "gallery" | "testimonials">("video");
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Lightbox gallery
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [steps, setSteps] = useState<Step[]>([
    { id: 1, label: "Initializing secure sandbox environment", status: "pending" },
    { id: 2, label: "Connecting to PostgreSQL database cluster", status: "pending" },
    { id: 3, label: "Synchronizing workspace 'CoreOps Studio'", status: "pending" },
    { id: 4, label: "Populating CRM & Project matrix details", status: "pending" },
    { id: 5, label: "Compiling real-time invoicing & financial KPIs", status: "pending" },
    { id: 6, label: "Launching CoreOps command center", status: "pending" },
  ]);

  // Handle live sandbox launch animation
  const handleLaunchSandbox = () => {
    setIsLaunching(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("launch") === "true") {
        setIsLaunching(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLaunching) return;

    let currentStepIndex = 0;
    
    // Set the first step to loading
    setSteps((prev) =>
      prev.map((step, idx) =>
        idx === 0 ? { ...step, status: "loading" } : step
      )
    );

    const interval = setInterval(() => {
      setSteps((prev) => {
        const next = [...prev];
        
        // Complete the current step
        if (currentStepIndex < next.length) {
          next[currentStepIndex].status = "completed";
        }
        
        // Move to next step and set it to loading
        currentStepIndex += 1;
        if (currentStepIndex < next.length) {
          next[currentStepIndex].status = "loading";
        } else {
          clearInterval(interval);
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
        }
        
        return next;
      });
    }, 450); // 450ms per step

    return () => clearInterval(interval);
  }, [isLaunching, router]);

  // Video progress simulated playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setVideoProgress((prev) => {
        if (prev >= 100) {
          // Move to next chapter or loop
          const nextChap = (activeChapter + 1) % videoChapters.length;
          setActiveChapter(nextChap);
          return 0;
        }
        return prev + 2.5; // Increment progress
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying, activeChapter]);

  const selectChapter = (index: number) => {
    setActiveChapter(index);
    setVideoProgress(0);
    setIsPlaying(true);
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
            <Link href="/pricing" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Pricing
            </Link>
            <span className="h-4 w-px bg-[#232D42]" />
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
              Demo Workspace Active
            </span>
          </nav>

          <div>
            <button
              onClick={handleLaunchSandbox}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
            >
              Try Live Sandbox
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
        
        {/* HERO CTA SECTION */}
        <section className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 shadow-inner mb-6 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Fully Seeded Operational Environment</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl md:leading-[1.1]">
            Experience CoreOps in{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              Real Time.
            </span>
          </h1>

          <p className="mt-6 text-base text-slate-300 sm:text-lg max-w-xl mx-auto leading-relaxed">
            Skip the signup form. Click below to boot a live, read-only demo account pre-populated with realistic agency data: 6 Clients, 7 Active Projects, and Ksh 315,000 Revenue.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLaunchSandbox}
              className="group relative inline-flex h-14 w-full sm:w-auto items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.03] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] cursor-pointer"
            >
              {/* Button sheen */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform group-hover:translate-x-full duration-1000" />
              <span>Launch Live Sandbox</span>
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href="#walkthrough-section"
              className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl border border-[#232D42] bg-[#161C2A]/70 px-8 text-base font-semibold text-slate-300 transition hover:bg-[#232D42] hover:text-white"
            >
              Explore Features Tour
            </a>
          </div>

          <p className="mt-4 text-xs text-slate-400 font-mono">
            ⚡ Launches client workspace sandbox inside 3 seconds. No credit card required.
          </p>
        </section>

        {/* INTERACTIVE FEATURE TOUR */}
        <section id="walkthrough-section" className="mb-20 border-t border-[#232D42]/40 pt-16">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-500">Interactive Feature Tour</h2>
            <p className="mt-2 text-2xl font-bold text-white">How CoreOps keeps you in control</p>
            <p className="mt-3 text-sm text-slate-400">
              Click the tabs below to preview the major components of the system. Hover or tap the glowing hotspots to read about specific operational signals.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 bg-[#161C2A]/60 p-1.5 rounded-2xl border border-[#232D42] max-w-2xl mx-auto">
            {(Object.keys(tabData) as TourTab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => {
                  setActiveTab(tabKey);
                  setActiveHotspot(null);
                }}
                className={`flex-1 min-w-[120px] rounded-xl py-2.5 text-xs font-bold transition-all ${
                  activeTab === tabKey
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                }`}
              >
                {tabKey === "crm" && "Client CRM"}
                {tabKey === "projects" && "Project Command"}
                {tabKey === "tasks" && "Task Backlog"}
                {tabKey === "invoices" && "Invoicing & Revenue"}
              </button>
            ))}
          </div>

          {/* Tour Viewport */}
          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* Screenshot Display Frame */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="group relative overflow-hidden rounded-2xl border border-[#232D42] bg-[#161C2A] shadow-2xl flex-1 flex flex-col">
                {/* Browser Header Bar */}
                <div className="flex items-center justify-between border-b border-[#232D42]/80 bg-[#0B101D] px-4 py-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex w-60 max-w-full items-center justify-center gap-1.5 rounded-md border border-[#232D42]/50 bg-[#161C2A] py-1 font-mono text-[9px] text-slate-400">
                    <Monitor className="h-2.5 w-2.5 text-blue-400" />
                    <span>coreops.studio/{activeTab}</span>
                  </div>
                  <div className="w-8" />
                </div>

                {/* Screenshot Frame Area */}
                <div className="relative aspect-[16/10] bg-[#0F172A] flex-1">
                  <Image
                    src={tabData[activeTab].screenshot}
                    alt={tabData[activeTab].title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 768px"
                    className="select-none object-cover object-top transition duration-500"
                    priority
                  />
                  {/* Subtle darkening tint */}
                  <div className="absolute inset-0 bg-[#0B101D]/5" />

                  {/* Hotspots */}
                  {tabData[activeTab].hotspots.map((hotspot, idx) => {
                    const isSelected = activeHotspot?.tab === activeTab && activeHotspot?.index === idx;
                    return (
                      <div
                        key={idx}
                        className="absolute"
                        style={{ left: hotspot.x, top: hotspot.y }}
                      >
                        {/* Glow effect ring */}
                        <span className="pointer-events-none absolute -inset-3 flex h-10 w-10 items-center justify-center rounded-full">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-blue-500/40 opacity-60" />
                          <span className="relative h-4 w-4 rounded-full bg-blue-500 shadow-md shadow-blue-500/40" />
                        </span>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              setActiveHotspot(null);
                            } else {
                              setActiveHotspot({ tab: activeTab, index: idx });
                            }
                          }}
                          className={`relative z-20 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-blue-500 text-[10px] font-black text-white hover:bg-blue-400 focus:outline-none transition-all duration-300 ${
                            isSelected ? "scale-125 bg-indigo-500 ring-4 ring-indigo-500/20" : ""
                          }`}
                        >
                          ?
                        </button>

                        {/* Hotspot details card popup */}
                        <div
                          className={`absolute bottom-full left-1/2 z-30 mb-3 w-56 -translate-x-1/2 rounded-xl border border-[#232D42] bg-[#161C2A]/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 ${
                            isSelected
                              ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
                              : "translate-y-2 scale-95 opacity-0 pointer-events-none"
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
                            <span>Operational Node</span>
                          </div>
                          <h4 className="mb-1 text-xs font-bold text-white">
                            {hotspot.title}
                          </h4>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            {hotspot.description}
                          </p>
                          <div className="absolute left-1/2 top-full -translate-x-1/2 border-6 border-transparent border-t-[#161C2A]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tab Copy & CTA Column */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#232D42] bg-[#161C2A]/50 p-6 sm:p-8">
              <div>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Feature View
                </span>
                
                <h3 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                  {tabData[activeTab].title}
                </h3>
                
                <p className="mt-4 text-xs leading-relaxed text-slate-300 italic border-l-2 border-blue-500/60 pl-3">
                  "{tabData[activeTab].valueText}"
                </p>

                <div className="mt-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Key Operations</h4>
                  <ul className="space-y-3">
                    {tabData[activeTab].highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </span>
                        <span className="text-xs text-slate-300 leading-normal">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 border-t border-[#232D42]/60 pt-6">
                <button
                  onClick={handleLaunchSandbox}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-[#232D42] hover:bg-[#2d3b58] text-xs font-bold text-indigo-300 transition-all hover:text-white gap-2"
                >
                  <span>Boot Sandbox Workspace</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* VIDEO WALKTHROUGH, GALLERY, AND TESTIMONIALS DRAWER */}
        <section className="mb-12 border-t border-[#232D42]/40 pt-16">
          <div className="flex flex-wrap justify-between items-end gap-6 mb-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400">Media, Mockups & Feedback</h2>
              <p className="mt-1 text-2xl font-bold text-white">Tour Deep-Dives</p>
            </div>
            
            {/* Horizontal subtab selector */}
            <div className="flex gap-1 border-b border-[#232D42] pb-0.5 font-semibold">
              <button
                onClick={() => setActiveSubTab("video")}
                className={`relative px-4 py-2 text-xs transition-all ${
                  activeSubTab === "video"
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Simulated Video
                </span>
              </button>
              <button
                onClick={() => setActiveSubTab("gallery")}
                className={`relative px-4 py-2 text-xs transition-all ${
                  activeSubTab === "gallery"
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Static Screenshots
                </span>
              </button>
              <button
                onClick={() => setActiveSubTab("testimonials")}
                className={`relative px-4 py-2 text-xs transition-all ${
                  activeSubTab === "testimonials"
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Quote className="h-3.5 w-3.5" />
                  Beta Testimonials
                </span>
              </button>
            </div>
          </div>

          {/* SUBTAB CONTENT PORT */}
          <div className="rounded-2xl border border-[#232D42] bg-[#161C2A]/30 p-6 md:p-8 backdrop-blur-sm min-h-[380px] flex flex-col justify-center">
            
            {/* VIDEO WALKTHROUGH SUBTAB */}
            {activeSubTab === "video" && (
              <div className="grid md:grid-cols-5 gap-8 items-stretch">
                {/* Playlist columns */}
                <div className="md:col-span-2 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Chapters Playlist</h4>
                  {videoChapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => selectChapter(chapter.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-start gap-3.5 ${
                        activeChapter === chapter.id
                          ? "bg-[#232D42]/60 border-blue-500/30 text-white shadow-md"
                          : "bg-[#161C2A]/40 border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-[#161C2A]/70"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[10px] ${
                        activeChapter === chapter.id
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : "border-slate-800 text-slate-500"
                      }`}>
                        {activeChapter === chapter.id && isPlaying ? (
                          <span className="flex gap-0.5 items-end h-2">
                            <span className="w-0.5 bg-blue-400 h-full animate-pulse" />
                            <span className="w-0.5 bg-blue-400 h-1.5 animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <span className="w-0.5 bg-blue-400 h-2.5 animate-pulse" style={{ animationDelay: "0.4s" }} />
                          </span>
                        ) : (
                          chapter.id + 1
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs truncate">{chapter.title}</span>
                          <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">{chapter.duration}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 leading-normal">{chapter.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Simulated Player Box */}
                <div className="md:col-span-3 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950 p-4 relative overflow-hidden">
                  {/* Backdrop Video Screenshot */}
                  <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-[#0F172A]">
                    <Image
                      src={videoChapters[activeChapter].image}
                      alt={videoChapters[activeChapter].title}
                      fill
                      sizes="500px"
                      className="object-cover object-top opacity-80"
                    />

                    {/* Playing/Paused Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-xl shadow-blue-500/20 hover:scale-105 hover:bg-blue-500 transition-all cursor-pointer border border-blue-400/40 relative z-30"
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 stroke-[2.5]" />
                        ) : (
                          <Play className="h-6 w-6 fill-current stroke-[2.5] ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Simulating Progress Bar Overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${isPlaying ? videoProgress : 0}%` }}
                      />
                    </div>

                    {/* Chapter Name Banner Overlay */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-bold font-mono tracking-wide text-blue-400 border border-slate-800">
                      Active: {videoChapters[activeChapter].title}
                    </div>

                    {/* Duration / Counter Display */}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-slate-300">
                      0:{(Math.floor(videoProgress * 0.25)).toString().padStart(2, "0")} / {videoChapters[activeChapter].duration}
                    </div>
                  </div>

                  {/* Player Controls Bar */}
                  <div className="mt-4 flex items-center justify-between text-slate-400 font-mono text-[10px] shrink-0 border-t border-slate-900 pt-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="hover:text-white transition"
                      >
                        {isPlaying ? "PAUSE" : "PLAY"}
                      </button>
                      <div className="flex items-center gap-1">
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>MUTED</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-blue-400 font-bold uppercase tracking-wider animate-pulse mr-1">
                        ● SIMULATED
                      </span>
                      <span>PREVIEW</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATIC SCREENSHOT GALLERY SUBTAB */}
            {activeSubTab === "gallery" && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Click to inspect high-resolution app mocks</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {screenshots.map((shot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxImage(shot.path)}
                      className="group text-left border border-slate-800/80 bg-[#161C2A]/60 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 shadow hover:shadow-lg"
                    >
                      <div className="relative aspect-[16/10] bg-[#0F172A] w-full overflow-hidden">
                        <Image
                          src={shot.path}
                          alt={shot.title}
                          fill
                          sizes="240px"
                          className="object-cover object-top transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                          <Maximize2 className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="p-3 text-[11px] font-bold text-slate-300 group-hover:text-white flex items-center justify-between">
                        <span className="truncate">{shot.title}</span>
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TESTIMONIALS SUBTAB */}
            {activeSubTab === "testimonials" && (
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((test, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-slate-800 bg-[#161C2A]/30 p-6 flex flex-col justify-between hover:border-slate-700/60 transition duration-300"
                  >
                    <Quote className="absolute top-4 right-4 h-8 w-8 text-blue-500/10 pointer-events-none" />
                    
                    <p className="text-xs leading-relaxed text-slate-200 font-medium">
                      "{test.quote}"
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-800/40 flex items-center gap-3">
                      {/* Avatar Circle */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-[10px] font-bold">
                        {test.author.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{test.author}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">{test.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
            <Link href="/pricing" className="transition hover:text-slate-300">Pricing</Link>
            <button onClick={handleLaunchSandbox} className="font-bold text-blue-400 transition hover:text-blue-300">
              Launch Sandbox
            </button>
          </div>

          <div>
            &copy; {new Date().getFullYear()} CoreOps Studio. All rights reserved.
          </div>
        </div>
      </footer>

      {/* TERMINAL OVERLAY CONSOLE (SANDBOX BOOT ANIMATION) */}
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B101D]/90 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#232D42] bg-[#161C2A]/95 p-8 shadow-2xl backdrop-blur-md">
            {/* Background glowing blobs */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute -top-[30%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
              <div className="absolute -bottom-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]" />
            </div>

            {/* Console Header */}
            <div className="relative z-10 flex flex-col items-center text-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 mb-4 animate-pulse">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Preparing Demo Sandbox
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Setting up operational dashboard workspace...
              </p>
            </div>

            {/* Console steps list */}
            <div className="relative z-10 space-y-3 font-mono text-[11px]">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all duration-300 ${
                    step.status === "completed"
                      ? "bg-[#232D42]/40 border-indigo-500/20 text-indigo-200"
                      : step.status === "loading"
                      ? "bg-blue-950/20 border-blue-500/30 text-blue-300 ring-1 ring-blue-500/10"
                      : "bg-transparent border-slate-900/60 text-slate-600"
                  }`}
                >
                  {step.status === "completed" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : step.status === "loading" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-blue-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-900 text-slate-600">
                      {step.id}
                    </span>
                  )}

                  <span className="flex-1 font-medium">{step.label}</span>

                  {step.status === "completed" && (
                    <span className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider">
                      done
                    </span>
                  )}
                  {step.status === "loading" && (
                    <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider animate-pulse">
                      running
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer console note */}
            <div className="relative z-10 mt-8 text-center text-[10px] text-slate-500 font-mono">
              Powered by CoreOps Engine v1.0.0 · Connection secure
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="relative w-full max-w-5xl aspect-[16/10] overflow-hidden rounded-2xl border border-slate-800">
            <Image
              src={lightboxImage}
              alt="Lightbox screenshot preview"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
