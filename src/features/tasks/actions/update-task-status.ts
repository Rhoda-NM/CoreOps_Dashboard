"use server";

import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { updateTaskStatus } from "@/server/services/tasks.service";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export async function updateTaskStatusAction(
  projectId: string,
  taskId: string,
  status: TaskStatus
) {
  await updateTaskStatus({
    taskId,
    status,
  });

  await revalidateWorkspacePath(`/projects/${projectId}`);
  await revalidateWorkspacePath("/tasks");

  return {
    success: true,
  };
}