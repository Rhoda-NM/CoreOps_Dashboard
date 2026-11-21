import type { getDashboardMetrics } from "@/server/services/dashboard.service";

type Metrics = Awaited<ReturnType<typeof getDashboardMetrics>>;
export type RecentWork = {
  key: string;
  kind: "Project" | "Task" | "Invoice";
  title: string;
  context: string;
  createdAt: Date;
  href: string;
  status?: string;
};

export const formatDashboardCount = (value: number) => new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
// Keep invoice value precision in this dashboard; do not change shared accounting formatting.
export const formatDashboardMoney = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value).replace(/\u00a0/g, " ");
const createdFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
export const formatWorkCreated = (value: Date) => `${createdFormatter.format(value)} EAT`;

export function recentDashboardWork(metrics: Metrics): RecentWork[] {
  const projects: RecentWork[] = metrics.recentProjects.map(project => ({
    key: `project-${project.id}`, kind: "Project", title: project.name, context: `Client · ${project.client.name}`, createdAt: project.createdAt,
    href: `/projects/${encodeURIComponent(project.id)}`,
  }));
  const tasks: RecentWork[] = metrics.recentTasks.map(task => ({
    key: `task-${task.id}`, kind: "Task", title: task.title, context: `Project · ${task.project.name}`, createdAt: task.createdAt,
    href: "/tasks", // There is no task-detail route.
  }));
  const invoices: RecentWork[] = metrics.role === "OWNER" ? metrics.recentInvoices.map(invoice => ({
    key: `invoice-${invoice.id}`, kind: "Invoice", title: invoice.invoiceNo, context: `Client · ${invoice.client.name}`, createdAt: invoice.createdAt,
    href: "/invoices", status: invoice.status, // No invoice amount enters a link/client prop.
  })) : [];
  return [...projects, ...tasks, ...invoices]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.key.localeCompare(b.key, "en"))
    .slice(0, 5);
}
