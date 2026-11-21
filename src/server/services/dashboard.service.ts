import { commercialAccess } from "../commercial/access";
import { prisma } from "@/server/db/prisma";
import { getOperationalMembership } from "../auth/get-current-workspace";
import { projectScope, taskScope, clientSummary, projectSummary } from "../authorization/policies";

export async function getDashboardMetrics() {
  const member = await getOperationalMembership("dashboard");
  const { workspaceId } = member;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [totalClients, activeProjects, pendingTasks, overdueTasks, recentProjects, recentTasks] = await Promise.all([
    member.role === "STAFF" ? Promise.resolve(0) : prisma.client.count({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.project.count({ where: { ...projectScope(member), status: "ACTIVE" } }),
    prisma.task.count({ where: { AND: [taskScope(member), { status: { not: "DONE" } }] } }),
    prisma.task.count({ where: { AND: [taskScope(member), { status: { not: "DONE" }, dueDate: { lt: now } }] } }),
    prisma.project.findMany({ where: projectScope(member), select: { id: true, name: true, createdAt: true, client: { select: clientSummary } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.task.findMany({ where: taskScope(member), select: { id: true, title: true, createdAt: true, project: { select: projectSummary } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  // Non-owners never query financial values, including recent invoice activity.
  const financial = member.role === "OWNER" ? await Promise.all([
    prisma.invoice.aggregate({ where: { workspaceId, status: "PAID", createdAt: { gte: startOfMonth, lt: endOfMonth } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { workspaceId, status: { not: "PAID" } }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { workspaceId }, select: { id: true, invoiceNo: true, status: true, createdAt: true, client: { select: clientSummary } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]) : null;
  // Presentation availability only; mutations still recheck their own authority.
  const canQuickAdd = member.role !== "STAFF" && (await commercialAccess(workspaceId)).write;
  return { canQuickAdd, role: member.role, totalClients, activeProjects, pendingTasks, overdueTasks, recentProjects, recentTasks,
    revenueThisMonth: financial ? Number(financial[0]._sum.amount || 0) : null,
    outstandingInvoices: financial ? Number(financial[1]._sum.amount || 0) : null,
    recentInvoices: financial ? financial[2] : [],
  };
}
