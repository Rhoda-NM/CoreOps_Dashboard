"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { archiveClient } from "@/server/services/clients.service";

export async function archiveClientAction(clientId: string): Promise<void> {
  await archiveClient(clientId);

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  redirect("/clients");
}