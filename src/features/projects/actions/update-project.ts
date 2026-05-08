"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateProjectSchema } from "../schemas/project-schema";
import { updateProject } from "@/server/services/projects.service";

export async function updateProjectAction(
  projectId: string,
  formData: FormData
) {
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
    deadline: formData.get("deadline"),
    budget: formData.get("budget"),
  };

  const result = updateProjectSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      error: "Invalid project data",
    };
  }

  await updateProject(projectId, {
    name: result.data.name,
    description: result.data.description || undefined,
    status: result.data.status,
    deadline: result.data.deadline || undefined,
    budget: result.data.budget || undefined,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  redirect(`/projects/${projectId}`);
}