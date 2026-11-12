import "server-only";
import { Pay1AdmissionError, type Pay1SettingName } from "./pay1-error";

export function pay1Enabled() { return process.env.COREOPS_PAY1_PREVIEW_ENABLED === "true"; }
// Presentation only: do not require a database record or provider REST request
// to display a public test form. Every authenticated mutation retains admission.
export function pay1AuthenticationFormsEnabled() {
  return pay1Enabled() && process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_");
}
function parseUrl(value: string | undefined) { try { return new URL(value ?? "invalid:"); } catch { return undefined; } }
function databaseName(database: URL | undefined) { try { return database && decodeURIComponent(database.pathname.slice(1)); } catch { return undefined; } }
function evaluate(env: NodeJS.ProcessEnv) {
  const database = parseUrl(env.DATABASE_URL), origin = parseUrl(env.COREOPS_APP_ORIGIN);
  const name = databaseName(database);
  const clerkKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const clerkHost = Buffer.from(clerkKey.slice(8), "base64").toString().replace(/\$$/, "");
  const prohibited: Pay1SettingName[] = ["COREOPS_MARKET_REHEARSAL_ENABLED", "COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED", "COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED", "COREOPS_LIFECYCLE_PROCESSING_ENABLED", "COREOPS_SECURE_EXPORTS_ENABLED", "COREOPS_NOTIFICATIONS_CAPTURE_ENABLED", "COREOPS_NOTIFICATIONS_SEND_ENABLED", "COREOPS_NOTIFICATIONS_SIMULATION_ENABLED", "COREOPS_RESEND_ENGINEERING_ENABLED", "PAYSTACK_LIVE_CHECKOUT_ENABLED"];
  const checks: [Pay1SettingName, boolean][] = [
    ["COREOPS_PAY1_PREVIEW_ENABLED", env.COREOPS_PAY1_PREVIEW_ENABLED === "true"],
    ["VERCEL", env.VERCEL === "1"],
    ["VERCEL_ENV", env.VERCEL_ENV === "preview"],
    ["VERCEL_TARGET_ENV", !env.VERCEL_TARGET_ENV || env.VERCEL_TARGET_ENV === "preview"],
    ["COREOPS_ENVIRONMENT", env.COREOPS_ENVIRONMENT === "preview"],
    ["VERCEL_PROJECT_ID", /^prj_[a-zA-Z0-9]+$/.test(env.VERCEL_PROJECT_ID ?? "")],
    ["VERCEL_DEPLOYMENT_ID", /^dpl_[a-zA-Z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? "")],
    ["COREOPS_PAY1_ADMISSION_ID", /^[a-zA-Z0-9_-]{8,100}$/.test(env.COREOPS_PAY1_ADMISSION_ID ?? "")],
    ["DATABASE_URL", !!database && ["postgres:", "postgresql:"].includes(database.protocol) && !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) && ["require", "verify-full"].includes(database.searchParams.get("sslmode") ?? "") && !!name],
    ["COREOPS_APP_ORIGIN", !!origin && origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash],
    ["COREOPS_ROUTING_MODE", env.COREOPS_ROUTING_MODE === "path"],
    ["COREOPS_MARKETING_ORIGIN", !!origin && env.COREOPS_MARKETING_ORIGIN === origin.origin],
    ["COREOPS_PREVIEW_HOSTS", !!origin && env.COREOPS_PREVIEW_HOSTS === origin.hostname],
    ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", clerkKey.startsWith("pk_test_") && /^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(clerkHost)],
    ["CLERK_SECRET_KEY", !!env.CLERK_SECRET_KEY?.startsWith("sk_test_")],
    ["PAYSTACK_LIVE_SECRET_KEY", !env.PAYSTACK_LIVE_SECRET_KEY],
    ...prohibited.map(key => [key, env[key] !== "true"] as [Pay1SettingName, boolean]),
  ];
  return {
    failed: checks.filter(([, valid]) => !valid).map(([key]) => key),
    target: database && origin ? { id: env.COREOPS_PAY1_ADMISSION_ID!, projectId: env.VERCEL_PROJECT_ID!, deploymentId: env.VERCEL_DEPLOYMENT_ID!, origin: origin.origin, databaseHost: `${database.hostname}:${database.port || "5432"}`, databaseName: name!, clerkHost } : undefined,
  };
}
// Safe for help/logs: closed setting names, never values, URLs or credentials.
export function pay1ConfigurationIssues(env: NodeJS.ProcessEnv = process.env) { return evaluate(env).failed; }
// Only deployment-owned inputs. Request headers never supply admission.
export function pay1Target() {
  const { failed, target } = evaluate(process.env);
  if (failed.length || !target) throw new Pay1AdmissionError("PAY1_CONFIGURATION_REQUIRED", failed);
  return target;
}
