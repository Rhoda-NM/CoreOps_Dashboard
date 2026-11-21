"use server";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { acknowledgeStaging } from "@/server/staging/acknowledgment";
import { redirect } from "next/navigation";
import { requireCentralHost } from "@/server/routing/request-context";
export async function acceptStagingNotice(returnTo: string, data: FormData) {
  await requireCentralHost();
  await acknowledgeStaging(data.get("accepted") === "on");
  redirect(safeAuthReturn(returnTo));
}
