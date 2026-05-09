"use server";

import { revalidatePath } from "next/cache";
import { projectSchema } from "../schemas/project-schema";
import { createProjectForClient } from "@/server/services/projects.service";

export async function createProjectAction(
  clientId: string,
  formData: FormData
): Promise<void> {
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    deadline: formData.get("deadline"),
    budget: formData.get("budget"),
  };

  const result = projectSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error("Invalid project data");
  }

  await createProjectForClient({
    clientId,
    name: result.data.name,
    description: result.data.description || undefined,
    deadline: result.data.deadline || undefined,
    budget: result.data.budget || undefined,
  });

  revalidatePath(`/clients/${clientId}`);

}