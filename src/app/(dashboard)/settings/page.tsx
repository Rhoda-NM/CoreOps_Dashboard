import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";

export default function SettingsPage() {
  return (
    <main className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your workspace, account, and CoreOps preferences."
      />

      <EmptyState
        icon={<Settings className="h-6 w-6" />}
        title="Settings coming soon"
        description="Workspace configuration, team roles, and preferences will live here."
      />
    </main>
  );
}