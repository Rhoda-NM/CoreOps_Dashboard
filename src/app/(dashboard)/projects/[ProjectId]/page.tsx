import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Receipt,
  Users,
} from "lucide-react";

import { getProjectById } from "@/server/services/projects.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CreateTaskPanel } from "@/features/tasks/components/Create TaskPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type ProjectDetailPageProps = {
  params: {
    projectId: string;
  };
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const project = await getProjectById(params.projectId);

  if (!project) {
    notFound();
  }

  const completedTasks = project.tasks.filter(
    (task) => task.status === "DONE"
  ).length;

  const progress =
    project.tasks.length === 0
      ? 0
      : Math.round((completedTasks / project.tasks.length) * 100);

  return (
    <main className="space-y-8">
      <Link
        href={`/clients/${project.clientId}`}
        className="inline-flex items-center gap-2 text-sm text-core-text-secondary transition hover:text-core-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to client
      </Link>

      <PageHeader
        title={project.name}
        description={
          project.description ||
          `Project workspace for ${project.client.name}.`
        }
        action={<Button variant="secondary">Edit Project</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-core-text-secondary">Client</p>
              <Users className="h-4 w-4 text-core-muted" />
            </div>
            <p className="mt-3 font-semibold text-core-text">
              {project.client.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-core-text-secondary">Status</p>
              <CheckSquare className="h-4 w-4 text-core-muted" />
            </div>
            <div className="mt-3">
              <Badge variant="info">{project.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-core-text-secondary">Deadline</p>
              <CalendarDays className="h-4 w-4 text-core-muted" />
            </div>
            <p className="mt-3 font-semibold text-core-text">
              {project.deadline
                ? new Date(project.deadline).toLocaleDateString()
                : "Not set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-core-text-secondary">Progress</p>
              <CheckSquare className="h-4 w-4 text-core-muted" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-core-text">
              {progress}%
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>

          <CardContent>
            <CreateTaskPanel
                    clientId={project.clientId}
                    projectId={project.id}
             />
            {project.tasks.length === 0 ? (
              <EmptyState
                icon={<CheckSquare className="h-6 w-6" />}
                title="No tasks yet"
                description="Create tasks for this project to start tracking execution."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {project.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium text-core-text">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.priority === "URGENT"
                              ? "danger"
                              : task.priority === "HIGH"
                              ? "warning"
                              : "muted"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{task.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Billing</CardTitle>
          </CardHeader>

          <CardContent>
            {project.invoices.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="No linked invoices"
                description="Invoices linked to this project will appear here."
              />
            ) : (
              <div className="space-y-3">
                {project.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-core-border bg-core-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-core-text">
                        {invoice.invoiceNo}
                      </p>
                      <Badge
                        variant={
                          invoice.status === "PAID"
                            ? "success"
                            : invoice.status === "OVERDUE"
                            ? "danger"
                            : invoice.status === "SENT"
                            ? "info"
                            : "warning"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-core-text-secondary">
                      KES {invoice.amount.toString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}