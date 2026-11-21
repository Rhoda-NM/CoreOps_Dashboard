"use client";

import { useId, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/workspaces/WorkspaceLink";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { Brand } from "@/components/brand/Brand";
import { groupedDashboardNav, isDashboardNavActive, workspaceRoleLabel } from "@/config/dashboard-nav";
import { QuickAddButton } from "@/features/quick-add/components/QuickAddButton";

export type WorkspaceIdentity = { id: string; name: string; slug: string | null };
export type WorkspaceOption = { slug: string; name: string };


type Props = {
  workspace: WorkspaceIdentity;
  workspaces?: WorkspaceOption[];
  role: string;
  label: string;
  dismissControl?: ReactNode;
  onNavigate?: () => void;
  onQuickAdd?: () => void;
};

// Shared presentation only. WorkspaceLink and the existing visibility policy
// continue to resolve destinations and decide which menu entries are visible.
export function WorkspaceNavigation({ workspace, workspaces = [], role, label, dismissControl, onNavigate, onQuickAdd }: Props) {
  const pathname = usePathname() ?? "";
  const id = useId();
  return <>
    <div className="workspace-identity">
      <div className="workspace-identity-top">
        <Link href="/dashboard" className="workspace-brand" onClick={onNavigate}><Brand className="text-workspace-on-brand" /></Link>
        {dismissControl}
      </div>
      <p className="workspace-identity-label">Business workspace</p>
      <p className="workspace-identity-name" title={workspace.name}>{workspace.name}</p>
      {workspaces.length > 1 && workspace.slug && <div className="workspace-switch"><WorkspaceSwitcher current={workspace.slug} workspaces={workspaces} /></div>}
    </div>
    <div className="workspace-menu-body">
      {role !== "STAFF" && <div className="workspace-quick-add" onClickCapture={onQuickAdd}><QuickAddButton /></div>}
      <nav aria-label={label} className="workspace-menu">
        {groupedDashboardNav(role).map(group => <section key={group.id} aria-labelledby={`${id}-${group.id}`} className="workspace-menu-group">
          <h2 id={`${id}-${group.id}`}>{group.title}</h2>
          {group.items.map(item => <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isDashboardNavActive(pathname, item.href) ? "page" : undefined} className="workspace-menu-link">
            <item.icon aria-hidden="true" size={18} /><span>{item.title}</span>
          </Link>)}
        </section>)}
      </nav>
      <div className="workspace-menu-footer"><span className="workspace-role-dot" aria-hidden="true" />{workspaceRoleLabel(role)} · Current workspace</div>
    </div>
  </>;
}
