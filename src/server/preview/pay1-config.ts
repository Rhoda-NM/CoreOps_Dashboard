import "server-only";
import { Pay1AdmissionError } from "./pay1-error";

export function pay1Enabled() { return process.env.COREOPS_PAY1_PREVIEW_ENABLED === "true"; }
// Only deployment-owned, server-side inputs. Request headers never supply admission.
export function pay1Target() {
  const env = process.env;
  try {
    const database = new URL(env.DATABASE_URL ?? "invalid:");
    const origin = new URL(env.COREOPS_APP_ORIGIN ?? "invalid:");
    const clerkKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
    const clerkHost = Buffer.from(clerkKey.slice(8), "base64").toString().replace(/\$$/, "");
    const prohibited = ["COREOPS_MARKET_REHEARSAL_ENABLED", "COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED", "COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED", "COREOPS_LIFECYCLE_PROCESSING_ENABLED", "COREOPS_SECURE_EXPORTS_ENABLED", "COREOPS_NOTIFICATIONS_CAPTURE_ENABLED", "COREOPS_NOTIFICATIONS_SEND_ENABLED", "COREOPS_NOTIFICATIONS_SIMULATION_ENABLED", "COREOPS_RESEND_ENGINEERING_ENABLED", "PAYSTACK_LIVE_CHECKOUT_ENABLED"];
    const runtimeMatches = pay1Enabled() && env.VERCEL === "1" && env.VERCEL_ENV === "preview" && env.COREOPS_ENVIRONMENT === "preview" && (!env.VERCEL_TARGET_ENV || env.VERCEL_TARGET_ENV === "preview");
    const deploymentMatches = /^prj_[a-zA-Z0-9]+$/.test(env.VERCEL_PROJECT_ID ?? "") && /^dpl_[a-zA-Z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? "") && /^[a-zA-Z0-9_-]{8,100}$/.test(env.COREOPS_PAY1_ADMISSION_ID ?? "");
    const databaseAllowed = ["postgres:", "postgresql:"].includes(database.protocol) && !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) && ["require", "verify-full"].includes(database.searchParams.get("sslmode") ?? "") && !!database.pathname.slice(1);
    const originMatches = origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash && env.COREOPS_ROUTING_MODE === "path" && env.COREOPS_MARKETING_ORIGIN === origin.origin && env.COREOPS_PREVIEW_HOSTS === origin.hostname;
    const testIdentityOnly = clerkKey.startsWith("pk_test_") && /^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(clerkHost) && env.CLERK_SECRET_KEY?.startsWith("sk_test_");
    if (!runtimeMatches || !deploymentMatches || !databaseAllowed || !originMatches || !testIdentityOnly || env.PAYSTACK_LIVE_SECRET_KEY || prohibited.some(key => env[key] === "true")) throw new Error();
    return { id: env.COREOPS_PAY1_ADMISSION_ID!, projectId: env.VERCEL_PROJECT_ID!, deploymentId: env.VERCEL_DEPLOYMENT_ID!, origin: origin.origin, databaseHost: `${database.hostname}:${database.port || "5432"}`, databaseName: decodeURIComponent(database.pathname.slice(1)), clerkHost };
  } catch { throw new Pay1AdmissionError("PAY1_CONFIGURATION_REQUIRED"); }
}
