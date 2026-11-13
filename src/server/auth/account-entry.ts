import "server-only";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { IdentityError, type IdentityFailure } from "./identity-error";
import { Pay1AdmissionError, pay1FailedSettings, type Pay1Failure } from "../preview/pay1-error";
export type AccountEntryFailure = IdentityFailure | Pay1Failure | "ACCOUNT_SCHEMA_REQUIRED" | "ACCOUNT_DATABASE_UNAVAILABLE";
const expectedReasons = new Set<string>(["STAGING_CONFIGURATION_REQUIRED", "STAGING_REGISTRATION_UNAVAILABLE", "VERIFICATION_REQUIRED", "IDENTITY_CONFLICT", "ACCOUNT_UNAVAILABLE", "SESSION_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "LEGAL_ACCEPTANCE_REQUIRED", "PAY1_REGISTRATION_UNAVAILABLE", "PAY1_CONFIGURATION_REQUIRED", "PAY1_SCHEMA_REQUIRED", "PAY1_ADMISSION_REQUIRED", "PAY1_ADMISSION_UNAVAILABLE", "PAY1_TARGET_MISMATCH", "PAY1_WINDOW_CLOSED", "PAY1_ACTOR_NOT_ADMITTED"]);
export function accountEntryFailure(error: unknown): AccountEntryFailure | null {
  if ((error instanceof IdentityError || error instanceof Pay1AdmissionError) && expectedReasons.has(error.reason)) return error.reason;
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) return "ACCOUNT_SCHEMA_REQUIRED";
  if (error instanceof Prisma.PrismaClientInitializationError) return "ACCOUNT_DATABASE_UNAVAILABLE";
  return null;
}
// Expected entry denials are help states. All unknown errors and framework
// redirects/not-found are rethrown unchanged; no raw exception is serialized.
export async function accountEntry<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const code = accountEntryFailure(error);
    if (code) {
      try { const settings = pay1FailedSettings(error); console.warn(JSON.stringify({ event: "ACCOUNT_ENTRY_DENIED", code, ...(settings.length ? { settings } : {}) })); } catch { /* No raw fallback. */ }
      redirect("/account/recovery");
    }
    throw error;
  }
}
