"use server";

import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { clientSchema } from "../schemas/client-schema";
import { createClient } from "@/server/services/clients.service";

export async function createClientAction(formData: FormData): Promise<void> {
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

  await createClient({
    name: result.data.name,
    company: result.data.company || undefined,
    email: result.data.email || undefined,
    phone: result.data.phone || undefined,
  });

  await revalidateWorkspacePath("/clients");
  await revalidateWorkspacePath("/dashboard");
}