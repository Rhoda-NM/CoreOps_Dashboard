"use server";

import { unstable_rethrow, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { requireCentralHost } from "@/server/routing/request-context";
import { selectedWorkspaceSlugMessage } from "@/lib/routing/workspace-slug";
import { WorkspaceAddressUnavailable, createInitialWorkspace, workspaceNameSchema } from "@/server/services/workspace-onboarding.service";

import { submitMarketApplication } from "@/server/market/service";

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
  let inquiry = false;
  try {
    let applicationId = String(formData.get("applicationId") ?? "");
    if (!applicationId) {
      const app = await submitMarketApplication({ country: String(formData.get("country") ?? ""), interest: String(formData.get("interest") ?? "") as "WORKFLOW", useCase: String(formData.get("useCase") ?? ""), attested: (formData.get("attested") === "on") as true, idempotencyKey: String(formData.get("key") ?? "") });
      applicationId = app.id;
      inquiry = app.state !== "APPROVED";
    }
    if (!inquiry) await createInitialWorkspace(result.data, slug, applicationId);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceAddressUnavailable) return { error: error.message };
    // Do not expose user records, connection details or provider error bodies.
    console.error("Workspace creation failed.");
    return { error: "Unable to create your workspace. Please try again." };
  }
  // Existing path navigation remains active until Phase 3 is approved.
  redirect(inquiry ? "/account/market" : "/dashboard");
}
