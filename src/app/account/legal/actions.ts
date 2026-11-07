"use server";
import { redirect } from "next/navigation";
import { recordLegalAcceptance } from "@/server/auth/legal-acceptance";
export async function acceptCurrentLegalAction(termsVersion: string, privacyVersion: string, form: FormData) {
  await recordLegalAcceptance(form.get("acceptLegal") === "on", { termsVersion, privacyVersion });
  redirect("/dashboard");
}
