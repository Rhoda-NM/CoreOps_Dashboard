import { CheckSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";

export default function TasksPage() {
  return (
    <main className="space-y-8">
      <PageHeader
        title="Tasks"
        description="Track work across all clients and projects."
      />

      <EmptyState
        icon={<CheckSquare className="h-6 w-6" />}
        title="Global tasks view coming soon"
        description="This page will help you view overdue, pending, and completed tasks across the agency."
      />
    </main>
  );
}