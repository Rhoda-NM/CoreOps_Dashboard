//src/components/ui/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";

import { dashboardNav } from "@/config/dashboard-nav";
import { QuickAddButton } from "@/features/quick-add/components/QuickAddButton";
import { cn } from "@/lib/cn";

type SidebarProps = {
  workspace: {
    id: string;
    name: string;
    slug: string | null;
  };
  role: string;
};

function formatRole(role: string) {
  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function Sidebar({ workspace, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r border-core-border bg-core-surface/95 px-5 py-6 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
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
      </Link>

      <div className="mb-5 rounded-2xl border border-core-border bg-core-card p-4">
        <p className="text-xs uppercase tracking-wide text-core-muted">
          Workspace
        </p>

        <p className="mt-1 truncate font-medium text-core-text">
          {workspace.name}
        </p>

        <p className="mt-1 text-xs text-core-text-secondary">
          {formatRole(role)}
        </p>
      </div>

      <div className="mb-6">
        <QuickAddButton />
      </div>

      <nav className="space-y-1">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-core-card text-core-text"
                  : "text-core-text-secondary hover:bg-core-card hover:text-core-text"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition",
                  isActive
                    ? "bg-core-primary/15 text-indigo-300"
                    : "bg-transparent group-hover:bg-core-primary/15 group-hover:text-indigo-300"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>

              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-2xl border border-core-border bg-core-card p-4">
        <p className="text-sm font-medium text-core-text">Workspace Mode</p>
        <p className="mt-1 text-xs leading-5 text-core-text-secondary">
          Your data is scoped to this workspace. Team access and client portal
          permissions will build on this structure.
        </p>
      </div>
    </aside>
  );
}