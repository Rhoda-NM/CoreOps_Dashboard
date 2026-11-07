"use server";
import { checkWorkspaceSlugAvailability } from "@/server/services/workspace-availability.service";
export async function checkWorkspaceSlugAction(slug: string) {
  return checkWorkspaceSlugAvailability(slug);
}
