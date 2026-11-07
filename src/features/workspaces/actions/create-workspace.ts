"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { requireCentralHost } from "@/server/routing/request-context";
import { selectedWorkspaceSlugMessage } from "@/lib/routing/workspace-slug";
import { WorkspaceAddressUnavailable, createInitialWorkspace, workspaceNameSchema } from "@/server/services/workspace-onboarding.service";

export type CreateWorkspaceState = { error: string };
export async function createWorkspaceAction(_previousState: CreateWorkspaceState, formData: FormData): Promise<CreateWorkspaceState> {
  await requireCentralHost();
  const slug = formData.get("slug");
  const slugError = selectedWorkspaceSlugMessage(slug);
  if (slugError) return { error: slugError };
  const result = workspaceNameSchema.safeParse(formData.get("name"));
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Enter a valid workspace name." };
  // Preserve identity/recovery redirects outside the database error boundary.
  // getCurrentUser is request-cached; the service reuses the same identity.
  await getCurrentUser();
  try {
    await createInitialWorkspace(result.data, slug);
  } catch (error) {
    if (error instanceof WorkspaceAddressUnavailable) return { error: error.message };
    // Do not expose user records, connection details or provider error bodies.
    console.error("Workspace creation failed.");
    return { error: "Unable to create your workspace. Please try again." };
  }
  // Existing path navigation remains active until Phase 3 is approved.
  redirect("/dashboard");
}
