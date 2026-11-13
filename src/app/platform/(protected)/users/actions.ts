"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setStagingUserSuspended } from "@/server/staging/users";
export async function changeAccountStatus(form: FormData) {
  try {
    const operation = form.get("operation");
    if (operation !== "suspend" && operation !== "restore") throw new Error("Invalid operation");
    await setStagingUserSuspended(String(form.get("userId") ?? ""), operation === "suspend", String(form.get("reason") ?? ""));
    revalidatePath("/platform/users");
  } catch (error) { unstable_rethrow(error); throw new Error("Unable to change account status. Review authorization and try again."); }
}
