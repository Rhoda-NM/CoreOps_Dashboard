//src/components/ui/layout/Sidebar.tsx
"use client";

import Link from "@/components/workspaces/WorkspaceLink";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand/Brand";

import { visibleDashboardNav } from "@/config/dashboard-nav";
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
        <div><Brand className="text-core-text"/><p className="mt-2 pl-[46px] text-[11px] text-core-text-secondary">Your business, connected.</p></div>
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
        {role !== "STAFF" && <QuickAddButton />}
      </div>

      <nav className="space-y-1">
        {visibleDashboardNav(role).map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname.replace(/^\/w\/[^/]+/, "") === item.href || pathname.replace(/^\/w\/[^/]+/, "").startsWith(`${item.href}/`);

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
                    ? "bg-core-primary/15 text-core-accent"
                    : "bg-transparent group-hover:bg-core-primary/15 group-hover:text-core-accent"
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
          Your membership and role apply to this business. Access to other workspaces is managed separately.
        </p>
      </div>
    </aside>
  );
}