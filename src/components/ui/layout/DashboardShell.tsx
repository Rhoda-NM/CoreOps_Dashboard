import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-core-bg text-core-text flex flex-col">
      {/* Interactive Demo Sandbox Top Banner */}
      <div className="w-full bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-blue-950/90 border-b border-indigo-500/20 py-3 px-4 text-center text-xs font-medium text-indigo-200 flex flex-wrap items-center justify-center gap-2 relative z-50">
        <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
        <span>You are exploring the CoreOps interactive demo account.</span>
        <Link
          href="/pricing"
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-0.5 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 hover:text-white transition-all border border-blue-500/30"
        >
          Create Your Own Workspace →
        </Link>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex flex-1 flex-col min-h-0">
          <Header />

          <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

