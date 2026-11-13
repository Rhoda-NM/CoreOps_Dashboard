"use server";
import { acknowledgeStaging } from "@/server/staging/acknowledgment";
import { redirect } from "next/navigation";
import { requireCentralHost } from "@/server/routing/request-context";
export async function acceptStagingNotice(data: FormData) {
  await requireCentralHost();
  await acknowledgeStaging(data.get("accepted") === "on");
  redirect("/dashboard");
}
