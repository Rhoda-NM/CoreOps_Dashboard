"use server";
import { unstable_rethrow } from "next/navigation";
import { getAuditActivity } from "@/server/services/activity.service";
export async function loadOlderActivity(cursor: string) {
  try { return { success: true as const, page: await getAuditActivity(cursor ?? null) }; }
  catch (error) {
    unstable_rethrow(error);
    return { success: false as const, message: "Unable to load older activity. Check your access and reload this page, or try again." };
  }
}
