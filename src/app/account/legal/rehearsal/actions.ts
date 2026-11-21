"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { acceptSyntheticLegalSet } from "@/server/legal/acceptance";
export async function acceptRehearsalLegalAction(data: FormData) {
  const intent = safeAuthReturn(data.get("returnTo"), "/account");
  try { await acceptSyntheticLegalSet({ presentationId: String(data.get("presentationId") ?? ""), publicationId: String(data.get("publicationId") ?? ""), manifestHash: String(data.get("manifestHash") ?? ""), agreeTerms: data.get("agreeTerms") === "on", acknowledgePrivacy: data.get("acknowledgePrivacy") === "on" }); }
  catch (error) { unstable_rethrow(error); redirect(`/account/legal/rehearsal?${new URLSearchParams({ result: "unavailable", returnTo: intent })}`); }
  redirect(intent);
}
