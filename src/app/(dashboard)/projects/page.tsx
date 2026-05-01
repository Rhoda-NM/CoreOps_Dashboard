import { BriefcaseBusiness } from "lucide-react";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";

export default function ProjectsPage() {
  return (
    <main className="space-y-8">
      <PageHeader
        title="Projects"
        description="View and manage all agency projects across clients."
      />

      <EmptyState
        icon={<BriefcaseBusiness className="h-6 w-6" />}
        title="Projects overview coming soon"
        description="This page will show all projects across your agency workspace."
      />
    </main>
  );
}