import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/authorization/authorize";
import { AccessError } from "@/server/authorization/errors";
import { projectMemberAction, taskAssignmentAction } from "./actions";
export async function ProjectAssignments({ projectId }: { projectId: string }) {
  const actor = await requirePermission("tasks:assign");
  const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId: actor.workspaceId }, select: { id: true, projectMembers: { select: { memberId: true } }, tasks: { select: { id: true, title: true, assignedMemberId: true, teamVisible: true } } } });
  if (!project) throw new AccessError("NOT_FOUND");
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId: actor.workspaceId, status: "ACTIVE" }, select: { id: true, role: true, user: { select: { name: true, email: true } } } });
  return <section className="space-y-4 rounded-xl border border-core-border p-4"><h2 className="text-lg font-semibold">Project team and task assignments</h2>
    {members.map(m => { const assigned = project.projectMembers.some(p => p.memberId === m.id); return <form key={m.id} action={projectMemberAction.bind(null, project.id)} className="flex flex-wrap items-center gap-3"><input type="hidden" name="memberId" value={m.id} /><input type="hidden" name="assigned" value={String(!assigned)} /><span>{m.user.name || m.user.email} · {m.role}</span><button className="rounded border p-2">{assigned ? "Remove from project" : "Add to project"}</button></form>; })}
    {project.tasks.map(t => <form key={t.id} action={taskAssignmentAction.bind(null, project.id, t.id)} className="flex flex-wrap items-center gap-3 border-t border-core-border pt-3"><span>{t.title}</span><label>Assignee<select className="ml-2 rounded bg-core-surface p-2" name="memberId" defaultValue={t.assignedMemberId ?? ""}><option value="">Unassigned</option>{members.filter(m => m.role !== "STAFF" || project.projectMembers.some(p => p.memberId === m.id)).map(m => <option key={m.id} value={m.id}>{m.user.name || m.user.email}</option>)}</select></label><label><input type="checkbox" name="teamVisible" defaultChecked={t.teamVisible} /> Visible to project team</label><button className="rounded border p-2">Save assignment</button></form>)}
  </section>;
}
