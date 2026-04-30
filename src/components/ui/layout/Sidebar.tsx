import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { dashboardNav } from "@/config/dashboard-nav";

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-core-border bg-core-surface/95 px-5 py-6 lg:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-core-primary text-white shadow-lg shadow-core-primary/20">
          <BriefcaseBusiness className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-core-text">
            CoreOps
          </h1>
          <p className="text-xs text-core-text-secondary">
            Agency command center
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-core-border bg-core-card p-4">
        <p className="text-xs uppercase tracking-wide text-core-muted">
          Workspace
        </p>
        <p className="mt-1 font-medium text-core-text">CoreOps Studio</p>
        <p className="mt-1 text-xs text-core-text-secondary">
          Freelance / Digital Agency
        </p>
      </div>

      <nav className="space-y-1">
        {dashboardNav.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-core-text-secondary transition hover:bg-core-card hover:text-core-text"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent transition group-hover:bg-core-primary/15 group-hover:text-indigo-300">
                <Icon className="h-4 w-4" />
              </span>
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-2xl border border-core-border bg-core-card p-4">
        <p className="text-sm font-medium text-core-text">MVP Focus</p>
        <p className="mt-1 text-xs leading-5 text-core-text-secondary">
          Manage clients, projects, tasks, invoices, and business activity.
        </p>
      </div>
    </aside>
  );
}