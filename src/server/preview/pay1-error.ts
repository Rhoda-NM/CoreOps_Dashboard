import { AccessError } from "../authorization/errors";
export type Pay1Failure = "PAY1_REGISTRATION_UNAVAILABLE" | "PAY1_CONFIGURATION_REQUIRED" | "PAY1_SCHEMA_REQUIRED" | "PAY1_ADMISSION_REQUIRED" | "PAY1_ADMISSION_UNAVAILABLE" | "PAY1_TARGET_MISMATCH" | "PAY1_WINDOW_CLOSED" | "PAY1_ACTOR_NOT_ADMITTED";
// Names only. Never attach configuration values or untrusted exception fields.
export const pay1SettingNames = [
  "COREOPS_PAY1_PREVIEW_ENABLED", "VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV",
  "COREOPS_ENVIRONMENT", "VERCEL_PROJECT_ID", "VERCEL_DEPLOYMENT_ID", "COREOPS_PAY1_ADMISSION_ID",
  "DATABASE_URL", "COREOPS_APP_ORIGIN", "COREOPS_ROUTING_MODE", "COREOPS_MARKETING_ORIGIN", "COREOPS_PREVIEW_HOSTS",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "PAYSTACK_LIVE_SECRET_KEY",
  "COREOPS_MARKET_REHEARSAL_ENABLED", "COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED",
  "COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED", "COREOPS_LIFECYCLE_PROCESSING_ENABLED", "COREOPS_SECURE_EXPORTS_ENABLED",
  "COREOPS_NOTIFICATIONS_CAPTURE_ENABLED", "COREOPS_NOTIFICATIONS_SEND_ENABLED", "COREOPS_NOTIFICATIONS_SIMULATION_ENABLED",
  "COREOPS_RESEND_ENGINEERING_ENABLED", "PAYSTACK_LIVE_CHECKOUT_ENABLED",
] as const;
export type Pay1SettingName = typeof pay1SettingNames[number];
function safeSettings(value: unknown): Pay1SettingName[] {
  return Array.isArray(value) ? pay1SettingNames.filter(name => value.includes(name)) : [];
}
export class Pay1AdmissionError extends AccessError {
  readonly failedSettings: readonly Pay1SettingName[];
  constructor(public readonly reason: Pay1Failure, failedSettings: readonly string[] = []) {
    super("FORBIDDEN"); this.name = "Pay1AdmissionError";
    this.failedSettings = reason === "PAY1_CONFIGURATION_REQUIRED" ? safeSettings(failedSettings) : [];
  }
}
export function pay1FailedSettings(error: unknown): Pay1SettingName[] {
  return error instanceof Pay1AdmissionError && error.reason === "PAY1_CONFIGURATION_REQUIRED" ? safeSettings(error.failedSettings) : [];
}
