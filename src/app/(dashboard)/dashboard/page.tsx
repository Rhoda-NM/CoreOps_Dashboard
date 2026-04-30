import {
  BriefcaseBusiness,
  CheckSquare,
  Receipt,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const metrics = [
  {
    title: "Total Clients",
    value: "0",
    description: "Active business relationships",
    icon: Users,
  },
  {
    title: "Active Projects",
    value: "0",
    description: "Currently in progress",
    icon: BriefcaseBusiness,
  },
  {
    title: "Pending Tasks",
    value: "0",
    description: "Work awaiting completion",
    icon: CheckSquare,
  },
  {
    title: "Unpaid Invoices",
    value: "KES 0",
    description: "Outstanding revenue",
    icon: Receipt,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-core-border bg-gradient-to-br from-core-card to-core-surface p-6 shadow-2xl shadow-black/20 md:flex-row md:items-end">
        <div>
          <Badge variant="default">CoreOps MVP</Badge>

          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-core-text md:text-4xl">
            Your agency operations, organized in one control center.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-core-text-secondary">
            Track clients, projects, tasks, invoices, and business activity from
            one clean operational dashboard.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-core-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-core-primary-hover">
          New Client
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.title} className="overflow-hidden">
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

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-core-primary/15 text-indigo-300">
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
                  Business events will appear here.
                </p>
              </div>

              <Badge variant="muted">Empty</Badge>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-core-border p-8 text-center">
              <p className="text-sm font-medium text-core-text">
                No activity yet
              </p>
              <p className="mt-1 text-sm text-core-text-secondary">
                Add clients, projects, tasks, or invoices to start building your
                operations timeline.
              </p>
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
                  No overdue tasks
                </p>
                <p className="mt-1 text-xs text-core-text-secondary">
                  You’re clear for now.
                </p>
              </div>

              <div className="rounded-2xl border border-core-border bg-core-surface p-4">
                <p className="text-sm font-medium text-core-text">
                  No unpaid invoices
                </p>
                <p className="mt-1 text-xs text-core-text-secondary">
                  Revenue tracking starts when invoices are added.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}