import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  Users,
} from "lucide-react";

import { getProjects } from "@/server/services/projects.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="space-y-8">
      <PageHeader
        title="Projects"
        description="View and manage all agency projects across clients."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness className="h-6 w-6" />}
          title="No projects yet"
          description="Create a project from a client profile to start tracking work."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const completedTasks = project.tasks.filter(
              (task) => task.status === "DONE"
            ).length;

            const progress =
              project.tasks.length === 0
                ? 0
                : Math.round((completedTasks / project.tasks.length) * 100);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block"
              >
                <Card className="h-full transition hover:border-core-primary/60 hover:bg-core-surface">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold text-core-text transition group-hover:text-indigo-300">
                          {project.name}
                        </h2>

                        <p className="mt-1 line-clamp-2 text-sm text-core-text-secondary">
                          {project.description || "No description provided."}
                        </p>
                      </div>

                      <ArrowUpRight className="h-4 w-4 text-core-muted transition group-hover:text-indigo-300" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="info">{project.status}</Badge>
                      <Badge variant="muted">{project.tasks.length} tasks</Badge>
                      <Badge variant="muted">{progress}% complete</Badge>
                    </div>

                    <div className="mt-6 grid gap-3 text-sm">
                      <div className="flex items-center gap-2 text-core-text-secondary">
                        <Users className="h-4 w-4 text-core-muted" />
                        <span>{project.client.name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-core-text-secondary">
                        <CheckSquare className="h-4 w-4 text-core-muted" />
                        <span>
                          {completedTasks}/{project.tasks.length} tasks done
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-core-text-secondary">
                        <CalendarDays className="h-4 w-4 text-core-muted" />
                        <span>
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString()
                            : "No deadline"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-core-surface">
                      <div
                        className="h-full rounded-full bg-core-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}