import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CheckCircle2, CheckSquare, Receipt, Users } from "lucide-react";
import Link from "@/components/workspaces/WorkspaceLink";
import { QuickAddButton } from "@/features/quick-add/components/QuickAddButton";
import { getDashboardMetrics } from "@/server/services/dashboard.service";
import { can } from "@/server/authorization/permissions";
import { formatDashboardCount as count, formatDashboardMoney as money, formatWorkCreated, recentDashboardWork } from "@/features/dashboard/presentation";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const owner = metrics.role === "OWNER";
  const recent = recentDashboardWork(metrics);
  const cards = [
    ...(metrics.role !== "STAFF" ? [{ key: "clients", title: "Total Clients", value: count(metrics.totalClients), description: metrics.totalClients ? "Active client records in this workspace." : "No active clients yet. Find client records from Clients.", icon: Users, tone: "neutral" }] : []),
    { key: "projects", title: "Active Projects", value: count(metrics.activeProjects), description: metrics.activeProjects ? "Projects currently marked active." : "No active projects currently visible to you.", icon: BriefcaseBusiness, tone: "neutral" },
    { key: "pending", title: "Pending Tasks", value: count(metrics.pendingTasks), description: metrics.pendingTasks ? "Open tasks, including overdue work." : "No pending tasks currently visible to you.", icon: CheckSquare, tone: "neutral" },
    { key: "overdue", title: "Overdue Tasks", value: count(metrics.overdueTasks), description: metrics.overdueTasks ? "Past their due date and still open." : "No overdue tasks currently visible to you.", icon: metrics.overdueTasks > 0 ? AlertTriangle : CheckCircle2, tone: metrics.overdueTasks > 0 ? "danger" : "neutral" },
    ...(owner ? [
      { key: "paid", title: "Paid invoices · this month", value: money(metrics.revenueThisMonth), description: "Paid invoices created this month; not cash receipts.", icon: Receipt, tone: "neutral" },
      { key: "unpaid", title: "Outstanding Invoices", value: money(metrics.outstandingInvoices), description: metrics.outstandingInvoices === 0 ? "No unpaid invoice value recorded, including drafts." : "Value not marked paid, including draft invoices.", icon: Receipt, tone: (metrics.outstandingInvoices ?? 0) > 0 ? "warning" : "neutral" },
    ] : []),
  ];
  const priorities = [
    ...(metrics.overdueTasks > 0 ? [{ key: "overdue", title: `${count(metrics.overdueTasks)} overdue ${metrics.overdueTasks === 1 ? "task" : "tasks"}`, detail: "Past their recorded due date. Review the task list for next steps.", href: "/tasks", action: "Review overdue work", icon: AlertTriangle, tone: "danger" }] : []),
    ...(metrics.pendingTasks > 0 ? [{ key: "pending", title: `${count(metrics.pendingTasks)} pending ${metrics.pendingTasks === 1 ? "task" : "tasks"}`, detail: "All tasks not marked done; this total includes overdue work.", href: "/tasks", action: "View pending work", icon: CheckSquare, tone: "neutral" }] : []),
    ...(owner && (metrics.outstandingInvoices ?? 0) > 0 ? [{ key: "unpaid", title: `${money(metrics.outstandingInvoices)} in unpaid invoices`, detail: "Includes drafts. Review invoice status before following up; unpaid does not always mean overdue.", href: "/invoices", action: "Review invoices", icon: Receipt, tone: "warning" }] : []),
  ];
  return <div className="dashboard-overview">
    <header className="dashboard-heading">
      <div><p className="dashboard-eyebrow">Your operations</p><h1>Workspace overview</h1><p className="dashboard-intro">{metrics.role === "STAFF" ? "Your assigned projects and visible team tasks, in one place." : owner ? "Your workspace’s projects, tasks and invoice records at a glance." : "Your workspace’s clients, projects and tasks at a glance."}</p></div>
      {metrics.canQuickAdd && metrics.role !== "STAFF" && <div className="dashboard-primary-action"><QuickAddButton /></div>}
    </header>

    <section aria-labelledby="dashboard-metrics-heading">
      <h2 id="dashboard-metrics-heading" className="sr-only">Operational metrics</h2>
      <dl className="dashboard-metrics">{cards.map(metric => <div key={metric.key} className={`dashboard-metric dashboard-tone-${metric.tone}`}>
        <dt><span>{metric.title}</span><span className="dashboard-metric-icon"><metric.icon aria-hidden="true" size={18} /></span></dt>
        <dd className="dashboard-metric-value">{metric.value}</dd><dd className="dashboard-metric-description">{metric.description}</dd>
      </div>)}</dl>
    </section>

    <div className="dashboard-panels">
      <section className="dashboard-panel" aria-labelledby="dashboard-attention-heading">
        <div className="dashboard-panel-heading"><div><h2 id="dashboard-attention-heading">Needs your attention</h2><p>Existing signals to help you decide what to review next.</p></div></div>
        {priorities.length ? <ul className="dashboard-priorities">{priorities.map(item => <li key={item.key} className={`dashboard-priority dashboard-tone-${item.tone}`}>
          <item.icon aria-hidden="true" size={19} /><div><h3>{item.title}</h3><p>{item.detail}</p><Link href={item.href}>{item.action}<ArrowUpRight aria-hidden="true" size={15} /></Link></div>
        </li>)}</ul> : <div className="dashboard-empty"><CheckCircle2 aria-hidden="true" size={25} /><h3>No pending work to highlight</h3><p>Nothing overdue or pending is currently visible to you{owner ? ", and no unpaid invoice value is recorded" : ""}.</p><Link href="/tasks">View tasks<ArrowUpRight aria-hidden="true" size={15} /></Link></div>}
      </section>

      <section className="dashboard-panel" aria-labelledby="dashboard-recent-heading">
        <div className="dashboard-panel-heading"><div><h2 id="dashboard-recent-heading">Recent work</h2><p>Most recently created {owner ? "projects, tasks and invoices" : "projects and tasks"}. Creation records, newest first.</p></div>{can(metrics.role, "audit:read") && <Link href="/activity" aria-label="View workspace audit activity">View activity<ArrowUpRight aria-hidden="true" size={15} /></Link>}</div>
        {recent.length ? <ol className="dashboard-recent">{recent.map(item => {
          const Icon = item.kind === "Project" ? BriefcaseBusiness : item.kind === "Task" ? CheckSquare : Receipt;
          return <li key={item.key}><Link href={item.href} aria-label={`${item.kind}: ${item.title}`}><span className="dashboard-record-icon"><Icon aria-hidden="true" size={18} /></span><div className="dashboard-record-body"><div className="dashboard-record-meta"><span>{item.kind}{item.status ? ` · ${item.status}` : ""}</span><time dateTime={item.createdAt.toISOString()}>Created {formatWorkCreated(item.createdAt)}</time></div><h3 title={item.title}>{item.title}</h3><p title={item.context}>{item.context}</p></div><ArrowUpRight className="dashboard-record-arrow" aria-hidden="true" size={16} /></Link></li>;
        })}</ol> : <div className="dashboard-empty"><BriefcaseBusiness aria-hidden="true" size={25} /><h3>No recent work yet</h3><p>{metrics.role === "STAFF" ? "Projects and tasks will appear here when they are visible through your assignments." : "Your latest project and task records will appear here as work is added."}</p><Link href="/projects">View projects<ArrowUpRight aria-hidden="true" size={15} /></Link></div>}
        {recent.length > 0 && <p className="dashboard-panel-footnote">Latest five available records · Creation dates shown in East Africa Time (UTC+3).</p>}
      </section>
    </div>
  </div>;
}
