// src/app/(dashboard)/layout.tsx
import Link from "next/link";
import { headers } from "next/headers";
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
  const path = (await headers()).get("x-coreops-path");
  if (!access.read && path !== `${base}/subscription`) redirect(`${base}/subscription`);
  if (!access.read) return <main className="mx-auto max-w-5xl space-y-6 p-6 text-core-text"><nav className="flex flex-wrap gap-6"><Link href="/dashboard">CoreOps · Workspaces</Link><Link href="/account">Account & security</Link></nav><p className="text-sm text-core-muted">{membership.workspace.name} · {membership.role}</p>{children}</main>;
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
        <div className="mb-4 flex flex-wrap gap-4 text-sm"><Link href={`${base}/subscription`}>Subscription</Link>{!access.write && <span>Read-only · renew your subscription to resume changes.</span>}{access.inGrace && <span>Your subscription is in its seven-day grace period.</span>}</div>
        {children}
      </DashboardShell>

      {access.write && membership.role !== "STAFF" && <QuickAddDialog role={membership.role} />}
    </QuickAddProvider>
  );
}