"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { submitMarketApplication, withdrawMarketApplication } from "@/server/market/service";
export async function marketApplicantAction(data: FormData) {
  const value = (key: string) => String(data.get(key) ?? "");
  try {
    if (value("operation") === "withdraw") await withdrawMarketApplication(value("id"), Number(value("revision")), value("key"));
    else await submitMarketApplication({ country: value("country"), interest: value("interest") as "WORKFLOW", useCase: value("useCase"), attested: (data.get("attested") === "on") as true, idempotencyKey: value("key"), ...(value("id") ? { applicationId: value("id"), expectedRevision: Number(value("revision")) } : {}) });
  } catch (error) { unstable_rethrow(error); redirect("/account/market?result=unavailable"); }
  revalidatePath("/account/market"); redirect("/account/market");
}
