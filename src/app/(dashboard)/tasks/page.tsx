{/*import Link from "next/link";
import { CheckSquare, CalendarDays, BriefcaseBusiness, Users } from "lucide-react";

import { getTasks } from "@/server/services/tasks.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TaskStatusSelect} from "@/features/tasks/components/TaskStatusSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";


function getPriorityVariant(priority: string) {
  if (priority === "URGENT") return "danger";
  if (priority === "HIGH") return "warning";
  return "muted";
}

function getTaskStatusVariant(status: string) {
  if (status === "DONE") return "success";
  if (status === "IN_PROGRESS") return "info";
  if (status === "REVIEW") return "warning";
  return "muted";
}

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <main className="space-y-8">
      <PageHeader
        title="Tasks"
        description="Track work across all clients and projects."
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-6 w-6" />}
          title="No tasks yet"
          description="Tasks will appear here once you create them inside a project."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium text-core-text">
                  {task.title}
                </TableCell>

                <TableCell>
                  <Link
                    href={`/clients/${task.project.client.id}`}
                    className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                  >
                    <Users className="h-4 w-4 text-core-muted" />
                    {task.project.client.name}
                  </Link>
                </TableCell>

                <TableCell>
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                  >
                    <BriefcaseBusiness className="h-4 w-4 text-core-muted" />
                    {task.project.name}
                  </Link>
                </TableCell>

                <TableCell>
                  <Badge variant={getPriorityVariant(task.priority)}>
                    {task.priority}
                  </Badge>
                </TableCell>

                <TableCell>
                    <TaskStatusSelect
                        projectId={task.project.id}
                        taskId={task.id}
                        currentStatus={task.status}
                    />
                </TableCell>

                <TableCell>
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-core-muted" />
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "—"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}*/}

import Link from "next/link";
import {
  CheckSquare,
  CalendarDays,
  BriefcaseBusiness,
  Users,
  AlertTriangle,
} from "lucide-react";

import { getTasks } from "@/server/services/tasks.service";
import { PageHeader } from "@/components/ui/shared/PageHeader";
import { EmptyState } from "@/components/ui/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { TaskStatusSelect } from "@/features/tasks/components/TaskStatusSelect";
import { isOverdue } from "@/lib/is-overdue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type TasksPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    priority?: string;
    filter?: string;
  }>;
};

function getPriorityVariant(priority: string) {
  if (priority === "URGENT") return "danger";
  if (priority === "HIGH") return "warning";
  return "muted";
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;

  const status =
    params.status === "TODO" ||
    params.status === "IN_PROGRESS" ||
    params.status === "REVIEW" ||
    params.status === "DONE"
      ? params.status
      : "ALL";

  const priority =
    params.priority === "LOW" ||
    params.priority === "MEDIUM" ||
    params.priority === "HIGH" ||
    params.priority === "URGENT"
      ? params.priority
      : "ALL";

  const filter =
    params.filter === "overdue" || params.filter === "pending"
      ? params.filter
      : "all";

  const tasks = await getTasks({
    query: params.query,
    status,
    priority,
    filter,
  });

  return (
    <main className="space-y-8">
      <PageHeader
        title="Tasks"
        description="Track work across all clients and projects."
      />

      <TaskFilters />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-6 w-6" />}
          title="No tasks found"
          description="Try adjusting your filters or create tasks inside a project."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status);

              return (
                <TableRow
                  key={task.id}
                  className={overdue ? "bg-red-500/5" : ""}
                >
                  <TableCell className="font-medium text-core-text">
                    <div className="flex items-center gap-2">
                      {overdue && (
                        <AlertTriangle className="h-4 w-4 text-red-300" />
                      )}
                      <span>{task.title}</span>
                    </div>

                    {overdue && (
                      <p className="mt-1 text-xs text-red-300">
                        This task is overdue
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/clients/${task.project.client.id}`}
                      className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                    >
                      <Users className="h-4 w-4 text-core-muted" />
                      {task.project.client.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="inline-flex items-center gap-2 transition hover:text-indigo-300"
                    >
                      <BriefcaseBusiness className="h-4 w-4 text-core-muted" />
                      {task.project.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <TaskStatusSelect
                      projectId={task.project.id}
                      taskId={task.id}
                      currentStatus={task.status}
                    />
                  </TableCell>

                  <TableCell>
                    <div
                      className={
                        overdue
                          ? "inline-flex items-center gap-2 text-red-300"
                          : "inline-flex items-center gap-2"
                      }
                    >
                      <CalendarDays className="h-4 w-4 text-core-muted" />
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}