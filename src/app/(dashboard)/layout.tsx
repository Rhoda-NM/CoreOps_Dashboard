// src/app/(dashboard)/layout.tsx

import { DashboardShell } from "@/components/ui/layout/DashboardShell";
import { QuickAddProvider } from "@/features/quick-add/components/QuickAddProvider";
import { QuickAddDialog } from "@/features/quick-add/components/QuickAddDialog";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuickAddProvider>
      <DashboardShell>{children}</DashboardShell>
      <QuickAddDialog />
    </QuickAddProvider>
  );
}