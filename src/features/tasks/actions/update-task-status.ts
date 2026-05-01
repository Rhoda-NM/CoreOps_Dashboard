"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/tasks");

  return {
    success: true,
  };
}