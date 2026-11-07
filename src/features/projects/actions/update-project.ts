"use server";
import { workspacePath } from "@/server/auth/get-current-workspace";

import { redirect } from "next/navigation";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { updateProjectSchema } from "../schemas/project-schema";
import { updateProject } from "@/server/services/projects.service";

export async function updateProjectAction(
  projectId: string,
  formData: FormData
): Promise<void> {
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
    deadline: formData.get("deadline"),
    budget: formData.get("budget"),
  };

  const result = updateProjectSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error("Invalid project data");
  }

  await updateProject(projectId, {
    name: result.data.name,
    description: result.data.description || undefined,
    status: result.data.status,
    deadline: result.data.deadline || undefined,
    budget: result.data.budget || undefined,
  });

  await revalidateWorkspacePath("/projects");
  await revalidateWorkspacePath(`/projects/${projectId}`);

  redirect(await workspacePath(`/projects/${projectId}`));
}