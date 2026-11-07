"use server";
import { renameWorkspace } from "@/server/services/workspaces.service";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
export async function renameWorkspaceAction(form: FormData) {
  await renameWorkspace(form.get("name"));
  await revalidateWorkspacePath("/settings");
  await revalidateWorkspacePath("/dashboard");
}
