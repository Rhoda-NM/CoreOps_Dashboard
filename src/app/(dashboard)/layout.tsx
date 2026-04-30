// src/app/(dashboard)/layout.tsx

import { DashboardShell } from "@/components/ui/layout/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}