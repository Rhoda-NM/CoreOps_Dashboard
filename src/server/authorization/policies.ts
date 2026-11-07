import type { Prisma, WorkspaceMember } from "@prisma/client";

type Member = Pick<WorkspaceMember, "id" | "workspaceId" | "role">;
export function projectScope(member: Member): Prisma.ProjectWhereInput {
  return { workspaceId: member.workspaceId, ...(member.role === "STAFF" ? { projectMembers: { some: { memberId: member.id } } } : {}) };
}
export function taskScope(member: Member): Prisma.TaskWhereInput {
  return { workspaceId: member.workspaceId, ...(member.role === "STAFF" ? {
    project: projectScope(member),
    OR: [{ assignedMemberId: member.id }, { teamVisible: true }],
  } : {}) };
}
export function taskWriteScope(member: Member): Prisma.TaskWhereInput {
  return { workspaceId: member.workspaceId, ...(member.role === "STAFF" ? {
    project: projectScope(member), assignedMemberId: member.id,
  } : {}) };
}
// Explicit selections prevent contact and budget fields entering staff payloads.
export const clientSummary = { id: true, name: true } satisfies Prisma.ClientSelect;
export const projectSummary = { id: true, name: true, clientId: true, client: { select: clientSummary } } satisfies Prisma.ProjectSelect;
