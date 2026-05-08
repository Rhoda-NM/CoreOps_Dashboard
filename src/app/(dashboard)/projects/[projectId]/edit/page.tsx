import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProjectById } from "@/server/services/projects.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EditProjectForm } from "@/features/projects/components/EditProjectForm";

type EditProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  const { projectId } = await params;

  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <main className="space-y-8">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm text-core-text-secondary transition hover:text-core-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <PageHeader
        title={`Edit ${project.name}`}
        description={`Update project details for ${project.client.name}.`}
      />

      <EditProjectForm project={project} />
    </main>
  );
}