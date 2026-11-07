"use server";

import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
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

  await revalidateWorkspacePath("/dashboard");
  await revalidateWorkspacePath("/projects");

  for (const path of pathsToRevalidate) {
    await revalidateWorkspacePath(path);
  }
}