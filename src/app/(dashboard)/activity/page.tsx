import { Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";

export default function ActivityPage() {
  return (
    <main className="space-y-8">
      <PageHeader
        title="Activity"
        description="Review recent client, project, task, and invoice activity."
      />

      <EmptyState
        icon={<Activity className="h-6 w-6" />}
        title="Activity timeline coming soon"
        description="CoreOps will log important business events here as your workspace grows."
      />
    </main>
  );
}