"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { reviewMarketApplication } from "@/server/market/service";
export async function marketReviewAction(data: FormData) {
 const value = (key: string) => String(data.get(key) ?? "");
 try { await reviewMarketApplication(value("id"), { type: value("type") as "APPROVE", expectedRevision: Number(value("revision")), reason: value("reason"), operationKey: value("key"), validUntil: value("validUntil") || undefined }); }
 catch (error) { unstable_rethrow(error); redirect("/platform/market?result=unavailable"); }
 revalidatePath("/platform/market"); redirect("/platform/market");
}
