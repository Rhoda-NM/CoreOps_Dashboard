"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);

  redirect(`/clients/${clientId}`);
}