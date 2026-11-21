"use server";

import { prisma } from "@/server/db/prisma";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { workspaceMutation } from "@/server/authorization/authorize";
import { createClient } from "@/server/services/clients.service";
import { createProjectForClient } from "@/server/services/projects.service";
import { createTaskForProject } from "@/server/services/tasks.service";
import { createInvoiceForClient } from "@/server/services/invoices.service";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { clientSchema } from "@/features/clients/schemas/client-schema";
import { projectSchema } from "@/features/projects/schemas/project-schema";
import { taskSchema } from "@/features/tasks/schemas/task-schema";
import { invoiceSchema } from "@/features/invoices/schemas/invoice-schema";
import type { CreationKind, CreationOptions, CreationResult } from "./types";

const permissions = { client: "clients:create", project: "projects:create", task: "tasks:create", invoice: "invoices:create" } as const;
function validKind(kind: string): kind is CreationKind { return Object.hasOwn(permissions, kind); }
function failure(error: unknown, refresh = false): Exclude<CreationResult, {success: true}> {
  unstable_rethrow(error);
  const reference = randomUUID();
  try { console.error(JSON.stringify({ event: "RECORD_CREATION_FAILED", code: refresh ? "REFRESH_FAILED" : "CREATE_UNAVAILABLE", reference })); } catch { /* No raw fallback. */ }
  return { success: false, message: "Unable to save. Check your access and selected records, then try again.", reference };
}

// Presentation hint only. Every options request and mutation independently rechecks.
export async function canOpenCreation(kind: CreationKind) {
  if (!validKind(kind)) return false;
  try { return await workspaceMutation(permissions[kind], async () => true); }
  catch (error) { unstable_rethrow(error); return false; }
}

export async function creationOptions(kind: CreationKind): Promise<{ success: true; options: CreationOptions } | { success: false; message: string }> {
  if (!validKind(kind)) return { success: false, message: "This form is unavailable." };
  try {
    const options = await workspaceMutation(permissions[kind], async (tx, actor) => {
      const where = { workspaceId: actor.workspaceId };
      const clients = kind === "project" || kind === "invoice" ? await tx.client.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
      const projects = kind === "task" || kind === "invoice" ? await tx.project.findMany({ where, select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }) : [];
      const members = kind === "task" ? await tx.workspaceMember.findMany({ where: { ...where, status: "ACTIVE", user: { platformSuspended: false } }, select: { id: true, role: true, user: { select: { name: true } }, projectAssignments: { select: { projectId: true } } } }) : [];
      return { clients, projects, members: members.map(m => ({ id: m.id, name: m.user.name || "Workspace teammate", projectIds: m.role === "STAFF" ? m.projectAssignments.map(p => p.projectId) : null })) };
    });
    return { success: true, options };
  } catch (error) { return failure(error); }
}

export async function createRecord(kind: CreationKind, form: FormData): Promise<CreationResult> {
  if (!validKind(kind)) return { success: false, message: "This form is unavailable." };
  const values = Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const schema = { client: clientSchema, project: projectSchema, task: taskSchema, invoice: invoiceSchema }[kind];
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { success: false, message: "Check the highlighted fields.", fields: Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])) };
  // Validate selector presence and date/decimal syntax without converting money to floats.
  const fields: Record<string, string> = {};
  if ((kind === "project" || kind === "invoice") && !values.clientId) fields.clientId = "Choose a client.";
  if (kind === "task" && !values.projectId) fields.projectId = "Choose a project.";
  for (const key of ["deadline", "dueDate"]) if (values[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(values[key]) || Number.isNaN(Date.parse(values[key])) || new Date(values[key]).toISOString().slice(0, 10) !== values[key])) fields[key] = "Enter a valid date.";
  for (const key of ["budget", "amount"]) if (values[key] && !/^\d+(\.\d+)?$/.test(values[key])) fields[key] = "Enter a non-negative amount.";
  if (Object.keys(fields).length) return { success: false, message: "Check the highlighted fields.", fields };
  let id: string;
  let taskContext: { workspaceId: string; projectId: string } | undefined;
  try {
    if (kind === "client") id = (await createClient(clientSchema.parse(values))).id;
    else if (kind === "project") id = (await createProjectForClient({ ...projectSchema.parse(values), clientId: values.clientId })).id;
    else if (kind === "task") {
      const task = await createTaskForProject({ ...taskSchema.parse(values), projectId: values.projectId, assignedMemberId: values.assignedMemberId || undefined });
      id = task.id;
      taskContext = { workspaceId: task.workspaceId, projectId: task.projectId };
    }
    else id = (await createInvoiceForClient({ ...invoiceSchema.parse(values), clientId: values.clientId })).id;
  } catch (error) { return failure(error); }
  try {
    const paths = ["/clients", "/projects", "/tasks", "/invoices", "/dashboard"];
    if (taskContext) {
      const project = await prisma.project.findFirst({ where: { id: taskContext.projectId, workspaceId: taskContext.workspaceId }, select: { clientId: true } });
      if (project) paths.push(`/clients/${encodeURIComponent(project.clientId)}`);
    }
    // IDs are path segments, never arbitrary caller-provided revalidation paths.
    if (values.clientId) paths.push(`/clients/${encodeURIComponent(values.clientId)}`);
    if (values.projectId) paths.push(`/projects/${encodeURIComponent(values.projectId)}`);
    for (const path of paths) await revalidateWorkspacePath(path);
  } catch (error) {
    failure(error, true);
    return { success: true, id, message: "Saved. Refresh the page to view the new record. Do not submit it again." };
  }
  return { success: true, id, message: `${kind[0].toUpperCase()}${kind.slice(1)} created.` };
}
