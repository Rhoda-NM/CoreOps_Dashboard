"use server";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { requireCentralHost } from "@/server/routing/request-context";
import { redirect } from "next/navigation";
import { recordLegalAcceptance } from "@/server/auth/legal-acceptance";
export async function acceptCurrentLegalAction(termsVersion: string, privacyVersion: string, returnTo: string, form: FormData) {
  await requireCentralHost();
  await recordLegalAcceptance(form.get("acceptLegal") === "on", { termsVersion, privacyVersion });
  redirect(safeAuthReturn(returnTo));
}
