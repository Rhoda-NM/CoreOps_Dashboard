"use server";
import { workspaceNavigationPath } from "@/server/routing/request-context";

import { redirect } from "next/navigation";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { clientSchema } from "../schemas/client-schema";
import { updateClient } from "@/server/services/clients.service";

export async function updateClientAction(
  clientId: string,
  formData: FormData
): Promise<void> {
  const rawData = {
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  };

  const result = clientSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error("Invalid client data");
  }

  await updateClient(clientId, {
    name: result.data.name,
    company: result.data.company || undefined,
    email: result.data.email || undefined,
    phone: result.data.phone || undefined,
  });

  await revalidateWorkspacePath("/clients");
  await revalidateWorkspacePath(`/clients/${clientId}`);

  redirect(await workspaceNavigationPath(`/clients/${clientId}`));
}