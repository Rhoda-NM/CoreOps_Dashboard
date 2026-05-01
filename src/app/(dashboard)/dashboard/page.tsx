import {
  BriefcaseBusiness,
  CheckSquare,
  Receipt,
  Users,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

import { getDashboardMetrics } from "@/server/services/dashboard.service";
import { formatKES } from "@/lib/format-currency";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/shared/PageHeader";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const metricCards = [
    {
      title: "Total Clients",
      value: metrics.totalClients.toString(),
      description: "Active business relationships",
      icon: Users,
    },
    {
      title: "Active Projects",
      value: metrics.activeProjects.toString(),
      description: "Projects currently in progress",
      icon: BriefcaseBusiness,
    },
    {
      title: "Pending Tasks",
      value: metrics.pendingTasks.toString(),
      description: "Tasks not yet completed",
      icon: CheckSquare,
    },
    {
      title: "Overdue Tasks",
      value: metrics.overdueTasks.toString(),
      description: "Tasks past due date",
      icon: AlertTriangle,
      danger: metrics.overdueTasks > 0,
    },
    {
      title: "Revenue This Month",
      value: formatKES(metrics.revenueThisMonth),
      description: "Paid invoices this month",
      icon: Receipt,
    },
    {
      title: "Outstanding Invoices",
      value: formatKES(metrics.outstandingInvoices),
      description: "Unpaid invoice value",
      icon: Receipt,
      warning: metrics.outstandingInvoices > 0,
    },
  ];

  return (
    <main className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your agency operations at a glance."
      />

      <section className="rounded-3xl border border-core-border bg-gradient-to-br from-core-card to-core-surface p-6 shadow-2xl shadow-black/20">
        <Badge variant="default">CoreOps Command Center</Badge>

        <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-core-text md:text-4xl">
          Your business pulse, updated from real operational data.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-core-text-secondary">
          Track clients, projects, tasks, invoices, overdue work, and revenue
          from one clean dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card
              key={metric.title}
              className={
                metric.danger
                  ? "border-red-500/40"
                  : metric.warning
                  ? "border-amber-500/40"
                  : ""
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-core-text-secondary">
                      {metric.title}
                    </p>

                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-core-text">
                      {metric.value}
                    </h2>
                  </div>

                  <div
                    className={
                      metric.danger
                        ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-300"
                        : metric.warning
                        ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"
                        : "flex h-11 w-11 items-center justify-center rounded-2xl bg-core-primary/15 text-indigo-300"
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-core-muted">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-core-text">
                  Recent Activity
                </h3>
                <p className="mt-1 text-sm text-core-text-secondary">
                  Recent projects, tasks, and invoices from your workspace.
                </p>
              </div>

              <Badge variant="muted">Live data</Badge>
            </div>

            <div className="mt-6 space-y-4">
              {metrics.recentProjects.length === 0 &&
              metrics.recentTasks.length === 0 &&
              metrics.recentInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-core-border p-8 text-center">
                  <p className="text-sm font-medium text-core-text">
                    No activity yet
                  </p>
                  <p className="mt-1 text-sm text-core-text-secondary">
                    Add clients, projects, tasks, or invoices to build your
                    operations timeline.
                  </p>
                </div>
              ) : (
                <>
                  {metrics.recentProjects.map((project) => (
                    <div
                      key={`project-${project.id}`}
                      className="flex items-start justify-between rounded-2xl border border-core-border bg-core-surface p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-core-text">
                          New project: {project.name}
                        </p>
                        <p className="mt-1 text-xs text-core-text-secondary">
                          Client: {project.client.name}
                        </p>
                      </div>

                      <Badge variant="info">Project</Badge>
                    </div>
                  ))}

                  {metrics.recentTasks.map((task) => (
                    <div
                      key={`task-${task.id}`}
                      className="flex items-start justify-between rounded-2xl border border-core-border bg-core-surface p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-core-text">
                          Task added: {task.title}
                        </p>
                        <p className="mt-1 text-xs text-core-text-secondary">
                          {task.project.client.name} / {task.project.name}
                        </p>
                      </div>

                      <Badge variant="muted">Task</Badge>
                    </div>
                  ))}

                  {metrics.recentInvoices.map((invoice) => (
                    <div
                      key={`invoice-${invoice.id}`}
                      className="flex items-start justify-between rounded-2xl border border-core-border bg-core-surface p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-core-text">
                          Invoice created: {invoice.invoiceNo}
                        </p>
                        <p className="mt-1 text-xs text-core-text-secondary">
                          {invoice.client.name} ·{" "}
                          {formatKES(Number(invoice.amount))}
                        </p>
                      </div>

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
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-core-text">Today’s Focus</h3>
            <p className="mt-1 text-sm text-core-text-secondary">
              What needs attention right now.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-core-border bg-core-surface p-4">
                <p className="text-sm font-medium text-core-text">
                  {metrics.overdueTasks > 0
                    ? `${metrics.overdueTasks} overdue tasks`
                    : "No overdue tasks"}
                </p>
                <p className="mt-1 text-xs text-core-text-secondary">
                  {metrics.overdueTasks > 0
                    ? "Review tasks that are past their due date."
                    : "You’re clear for now."}
                </p>
              </div>

              <div className="rounded-2xl border border-core-border bg-core-surface p-4">
                <p className="text-sm font-medium text-core-text">
                  {metrics.outstandingInvoices > 0
                    ? `${formatKES(metrics.outstandingInvoices)} outstanding`
                    : "No unpaid invoices"}
                </p>
                <p className="mt-1 text-xs text-core-text-secondary">
                  {metrics.outstandingInvoices > 0
                    ? "Follow up on unpaid client invoices."
                    : "Revenue tracking looks clean."}
                </p>
              </div>

              <div className="rounded-2xl border border-core-border bg-core-surface p-4">
                <p className="text-sm font-medium text-core-text">
                  {metrics.pendingTasks} pending tasks
                </p>
                <p className="mt-1 text-xs text-core-text-secondary">
                  Tasks still moving through your execution pipeline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}