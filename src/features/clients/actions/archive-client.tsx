"use server";
import { workspaceNavigationPath } from "@/server/routing/request-context";

import { redirect } from "next/navigation";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { archiveClient } from "@/server/services/clients.service";

export async function archiveClientAction(clientId: string): Promise<void> {
  await archiveClient(clientId);

  await revalidateWorkspacePath("/clients");
  await revalidateWorkspacePath("/dashboard");

  redirect(await workspaceNavigationPath("/clients"));
}