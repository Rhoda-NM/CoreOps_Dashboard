"use server";

import { revalidatePath } from "next/cache";
import { updateProjectStatus } from "@/server/services/projects.service";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

export async function updateProjectStatusAction(
  projectId: string,
  status: ProjectStatus,
  pathsToRevalidate: string[] = []
): Promise<void> {
  await updateProjectStatus({
    projectId,
    status,
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");

  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }
}