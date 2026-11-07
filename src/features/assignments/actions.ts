"use server";
import { setProjectMember, assignTask } from "@/server/services/assignments.service";
import { updateTaskDetails } from "@/server/services/tasks.service";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
export async function projectMemberAction(projectId: string, form: FormData) {
  await setProjectMember(projectId, String(form.get("memberId") ?? ""), form.get("assigned") === "true");
  await revalidateWorkspacePath(`/projects/${projectId}`);
}
export async function taskAssignmentAction(projectId: string, taskId: string, form: FormData) {
  await assignTask(taskId, String(form.get("memberId") ?? "") || null, form.get("teamVisible") === "on");
  await revalidateWorkspacePath(`/projects/${projectId}`);
  await revalidateWorkspacePath("/tasks");
}
export async function taskDetailsAction(projectId: string, taskId: string, form: FormData) {
  await updateTaskDetails(taskId, { title: String(form.get("title") ?? ""), description: String(form.get("description") ?? "") });
  await revalidateWorkspacePath(`/projects/${projectId}`);
  await revalidateWorkspacePath("/tasks");
}
