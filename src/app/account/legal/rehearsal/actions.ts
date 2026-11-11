"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { acceptSyntheticLegalSet } from "@/server/legal/acceptance";
export async function acceptRehearsalLegalAction(data: FormData) {
  try { await acceptSyntheticLegalSet({ presentationId: String(data.get("presentationId") ?? ""), publicationId: String(data.get("publicationId") ?? ""), manifestHash: String(data.get("manifestHash") ?? ""), agreeTerms: data.get("agreeTerms") === "on", acknowledgePrivacy: data.get("acknowledgePrivacy") === "on" }); }
  catch (error) { unstable_rethrow(error); redirect("/account/legal/rehearsal?result=unavailable"); }
  redirect("/account");
}
