import "server-only";
import { Prisma } from "@prisma/client";
import { zip, csv } from "./zip";
export const EXPORT_LIMITS = { rowsPerTable: 5000, totalRows: 20000, sourceBytes: 4 * 1024 * 1024, zipBytes: 8 * 1024 * 1024 };
export async function exportContent(tx: Prisma.TransactionClient, workspaceId: string, now: Date) {
  let rows = 0, bytes = 0;
  for (const table of ["Client", "Project", "ProjectMember", "Task", "Invoice", "WorkspaceMember"]) {
    const [size] = await tx.$queryRaw<{ count: bigint; bytes: bigint }[]>(Prisma.sql`SELECT count(*) AS count, coalesce(sum(octet_length(row_to_json(t)::text)),0)::bigint AS bytes FROM ${Prisma.raw(`"${table}"`)} t WHERE "workspaceId"=${workspaceId}`);
    rows += Number(size.count); bytes += Number(size.bytes);
    if (Number(size.count) > EXPORT_LIMITS.rowsPerTable || rows > EXPORT_LIMITS.totalRows || bytes > EXPORT_LIMITS.sourceBytes) throw new Error("EXPORT_TOO_LARGE");
  }
  const [names] = await tx.$queryRaw<{ bytes: bigint }[]>`SELECT coalesce(sum(octet_length(u.name)),0)::bigint AS bytes FROM "WorkspaceMember" m JOIN "User" u ON u.id=m."userId" WHERE m."workspaceId"=${workspaceId}`;
  const [workspaceSize] = await tx.$queryRaw<{ bytes: number }[]>`SELECT octet_length(name)+coalesce(octet_length(slug),0) AS bytes FROM "Workspace" WHERE id=${workspaceId}`;
  if (bytes + Number(names.bytes) + workspaceSize.bytes > EXPORT_LIMITS.sourceBytes) throw new Error("EXPORT_TOO_LARGE");
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { id: true, name: true, slug: true, createdAt: true } });
  const clients = await tx.client.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, name: true, company: true, email: true, phone: true, status: true, createdAt: true, updatedAt: true } });
  const projects = await tx.project.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, clientId: true, name: true, description: true, status: true, budget: true, deadline: true, createdAt: true, updatedAt: true } });
  const assignments = await tx.projectMember.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, projectId: true, memberId: true, createdAt: true } });
  const tasks = await tx.task.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, projectId: true, assignedMemberId: true, title: true, description: true, status: true, priority: true, teamVisible: true, dueDate: true, createdAt: true, updatedAt: true } });
  const invoices = await tx.invoice.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, invoiceNo: true, clientId: true, projectId: true, status: true, amount: true, dueDate: true, createdAt: true, updatedAt: true } });
  const memberships = await tx.workspaceMember.findMany({ where: { workspaceId }, orderBy: { id: "asc" }, take: 5001, select: { id: true, role: true, status: true, user: { select: { name: true } } } });
  const members = memberships.map(m => ({ id: m.id, name: m.user.name, role: m.role, status: m.status }));
  const data = { workspace: [workspace], clients, projects, assignments, tasks, invoices, members };
  const columns = {
    workspace: ["id", "name", "slug", "createdAt"], clients: ["id", "name", "company", "email", "phone", "status", "createdAt", "updatedAt"],
    projects: ["id", "clientId", "name", "description", "status", "budget", "deadline", "createdAt", "updatedAt"], assignments: ["id", "projectId", "memberId", "createdAt"],
    tasks: ["id", "projectId", "assignedMemberId", "title", "description", "status", "priority", "teamVisible", "dueDate", "createdAt", "updatedAt"], invoices: ["id", "invoiceNo", "clientId", "projectId", "status", "amount", "dueDate", "createdAt", "updatedAt"], members: ["id", "name", "role", "status"]
  };
  const files: Record<string, string> = {
    "export.json": JSON.stringify({ schemaVersion: "workspace-export-v1", generatedAt: now.toISOString(), ...data }),
    "README.txt": "WorkflowConnect workspace-export-v1\nUTF-8 JSON and RFC-style quoted CSV. Dates are UTC ISO-8601; exact decimals are strings. Null JSON values become empty CSV cells. CSV formula-like cells have an apostrophe prefix; JSON preserves original values. IDs preserve client/project/task/invoice and workspace membership relationships. Member IDs identify workspace memberships, not authentication accounts. No attachments exist in this application. Platform payments, internal audits, authentication identifiers, invitation tokens and provider secrets are excluded.\n"
  };
  for (const name of Object.keys(data) as (keyof typeof data)[]) files[`${name}.csv`] = csv(data[name], columns[name]);
  return zip(files, EXPORT_LIMITS.zipBytes);
}
