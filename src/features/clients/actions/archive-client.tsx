"use server";
import { workspacePath } from "@/server/auth/get-current-workspace";

import { redirect } from "next/navigation";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { archiveClient } from "@/server/services/clients.service";

export async function archiveClientAction(clientId: string): Promise<void> {
  await archiveClient(clientId);

  await revalidateWorkspacePath("/clients");
  await revalidateWorkspacePath("/dashboard");

  redirect(await workspacePath("/clients"));
}