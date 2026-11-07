import "server-only";
import { z } from "zod";
import { workspaceMutation, audit } from "../authorization/authorize";
import { AccessError } from "../authorization/errors";

export async function setProjectMember(projectId: string, memberId: string, assigned: boolean) {
  return workspaceMutation("tasks:assign", async (tx, actor) => {
    const project = await tx.project.findFirst({ where: { id: projectId, workspaceId: actor.workspaceId } });
    const member = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId: actor.workspaceId, ...(assigned ? { status: "ACTIVE" as const } : {}) } });
    if (!project || !member) throw new AccessError("NOT_FOUND");
    if (assigned) await tx.projectMember.upsert({ where: { projectId_memberId: { projectId, memberId } }, update: {}, create: { workspaceId: actor.workspaceId, projectId, memberId } });
    else {
      if (await tx.task.count({ where: { projectId, workspaceId: actor.workspaceId, assignedMemberId: memberId } })) throw new AccessError("CONFLICT");
      await tx.projectMember.deleteMany({ where: { projectId, memberId, workspaceId: actor.workspaceId } });
    }
    await audit(tx, actor, assigned ? "PROJECT_MEMBER_ADDED" : "PROJECT_MEMBER_REMOVED", "Project", projectId, { memberId });
  });
}
export async function assignTask(taskId: string, memberId: string | null, teamVisible: boolean) {
  z.boolean().parse(teamVisible);
  return workspaceMutation("tasks:assign", async (tx, actor) => {
    const task = await tx.task.findFirst({ where: { id: taskId, workspaceId: actor.workspaceId } });
    if (!task) throw new AccessError("NOT_FOUND");
    if (memberId) {
      const member = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId: actor.workspaceId, status: "ACTIVE" } });
      if (!member) throw new AccessError("NOT_FOUND");
      if (member.role === "STAFF" && !await tx.projectMember.findUnique({ where: { projectId_memberId: { projectId: task.projectId, memberId } } })) throw new AccessError("CONFLICT");
    }
    await tx.task.update({ where: { id: taskId, workspaceId: actor.workspaceId }, data: { assignedMemberId: memberId, teamVisible } });
    await audit(tx, actor, "TASK_ASSIGNMENT_CHANGED", "Task", taskId, { memberId, teamVisible });
  });
}
