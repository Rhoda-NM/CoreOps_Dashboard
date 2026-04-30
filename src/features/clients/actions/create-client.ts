"use server";

import { revalidatePath } from "next/cache";
import { clientSchema } from "../schemas/client-schema";
import { createClient } from "@/server/services/clients.service";

export async function createClientAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  };

  const result = clientSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      error: "Invalid client data",
    };
  }

  await createClient({
    name: result.data.name,
    company: result.data.company || undefined,
    email: result.data.email || undefined,
    phone: result.data.phone || undefined,
  });

  revalidatePath("/clients");

  return {
    success: true,
  };
}