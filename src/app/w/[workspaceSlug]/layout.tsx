import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
// src/app/(dashboard)/layout.tsx
import Link from "next/link";
import { dataAccessEnabled } from "@/server/data-access/security";
import { centralUrl } from "@/lib/routing/host-policy";
import { workspaceRoutingContext, workspaceNavigationPath } from "@/server/routing/request-context";
import { redirect } from "next/navigation";
import { commercialAccess } from "@/server/commercial/access";
import { DashboardShell } from "@/components/ui/layout/DashboardShell";
import { QuickAddProvider } from "@/features/quick-add/components/QuickAddProvider";
import { QuickAddDialog } from "@/features/quick-add/components/QuickAddDialog";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { getActiveMemberships } from "@/server/auth/get-current-workspace";
import { getCurrentWorkspaceMembership } from "@/server/auth/get-current-workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getCurrentWorkspaceMembership();

  const memberships = await getActiveMemberships();
  const access = await commercialAccess(membership.workspaceId);
  const base = `/w/${encodeURIComponent(membership.workspace.slug!)}`;
  const routing = await workspaceRoutingContext();
  const path = routing.internalPath;
  const workspacesHref = routing.policy.mode === "subdomain" ? centralUrl(routing.policy, "/dashboard") : "/dashboard";
  const dataHref = centralUrl(routing.policy, "/account/data");
  const accountHref = routing.policy.mode === "subdomain" ? centralUrl(routing.policy, "/account") : "/account";
  if (!access.read && path !== `${base}/subscription`) redirect(await workspaceNavigationPath("/subscription"));
  if (!access.read) return <main className="mx-auto max-w-5xl space-y-6 p-6 text-core-text"><nav className="flex flex-wrap gap-6"><Link href={workspacesHref}>WorkflowConnect · Workspaces</Link><Link href={accountHref}>Account & security</Link>{dataAccessEnabled() && membership.role === "OWNER" && <Link href={dataHref}>Exports & recovery</Link>}</nav><p className="text-sm text-core-muted">{membership.workspace.name} · {membership.role}</p>{access.lifecycle?.state === "CANCELED" && <p role="status">This workspace is canceled. Normal workspace access is unavailable. Contact support for a recovery review. The calculated retention deadline is {access.lifecycle.retentionEndsAt?.toISOString()}; no deletion is enabled.</p>}{children}</main>;
  return (
    <QuickAddProvider>
      <DashboardShell
        workspace={{
          id: membership.workspace.id,
          name: membership.workspace.name,
          slug: membership.workspace.slug,
        }}
        user={{
          name: membership.user.name,
          email: membership.user.email,
          imageUrl: membership.user.imageUrl,
          role: membership.role,
        }}
      >
        {memberships.length > 1 && <WorkspaceSwitcher current={membership.workspace.slug!} workspaces={memberships.map(m => ({ slug: m.workspace.slug!, name: m.workspace.name }))} />}
        <div className="mb-4 flex flex-wrap gap-4 text-sm"><Link href={await workspaceNavigationPath("/subscription")}>Subscription</Link>{dataAccessEnabled() && membership.role === "OWNER" && <Link href={dataHref}>Export workspace data</Link>}{!access.write && <span>{access.lifecycle?.state === "ARCHIVED" ? "Archived · read-only. Renew your subscription to resume changes." : "Read-only · renew your subscription to resume changes."}</span>}{access.inGrace && <span>Your subscription is in its seven-day grace period.</span>}</div>
        {children}
      </DashboardShell>

      {access.write && membership.role !== "STAFF" && <QuickAddDialog role={membership.role} />}
    </QuickAddProvider>
  );
}
