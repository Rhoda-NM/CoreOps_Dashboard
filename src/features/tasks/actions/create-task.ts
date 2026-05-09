"use server";

import { revalidatePath } from "next/cache";
import { taskSchema } from "../schemas/task-schema";
import { createTaskForProject } from "@/server/services/tasks.service";

export async function createTaskAction(
  clientId: string,
  projectId: string,
  formData: FormData
): Promise<void> {
  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
  };

  const result = taskSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error("Invalid task data");
  }

  await createTaskForProject({
    projectId,
    title: result.data.title,
    description: result.data.description || undefined,
    priority: result.data.priority,
    dueDate: result.data.dueDate || undefined,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${projectId}`);
}