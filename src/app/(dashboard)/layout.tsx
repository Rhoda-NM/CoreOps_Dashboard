// src/app/(dashboard)/layout.tsx
import { DashboardShell } from "@/components/ui/layout/DashboardShell";
import { QuickAddProvider } from "@/features/quick-add/components/QuickAddProvider";
import { QuickAddDialog } from "@/features/quick-add/components/QuickAddDialog";
import { getCurrentWorkspaceMembership } from "@/server/auth/get-current-workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getCurrentWorkspaceMembership();

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
        {children}
      </DashboardShell>

      <QuickAddDialog />
    </QuickAddProvider>
  );
}