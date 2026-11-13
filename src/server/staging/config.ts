import "server-only";
import { IdentityError } from "../auth/identity-error";
export function stagingRequested() { return process.env.COREOPS_STAGING_ENABLED === "true" || process.env.COREOPS_ENVIRONMENT === "staging"; }
export function stagingTarget({ reviewedOperator = false }: { reviewedOperator?: boolean } = {}) {
  const e = process.env;
  const deny = () => { throw new IdentityError("STAGING_CONFIGURATION_REQUIRED"); };
  if (e.COREOPS_STAGING_ENABLED !== "true" || e.COREOPS_ENVIRONMENT !== "staging" || e.COREOPS_PAY1_PREVIEW_ENABLED === "true") return deny();
  const parse = (value: string | undefined) => { try { return new URL(value || "invalid:"); } catch { return deny(); } };
  const database = parse(e.DATABASE_URL), origin = parse(e.COREOPS_APP_ORIGIN);
  const local = e.COREOPS_STAGING_REHEARSAL_ENABLED === "true" && !e.VERCEL && !e.VERCEL_ENV && ["localhost", "127.0.0.1"].includes(database.hostname) && /^\/coreops_auth_rehearsal_staging_[a-z0-9_]+$/.test(database.pathname);
  if (!local && !e.COREOPS_STAGING_BRANCH) return deny();
  if (e.VERCEL_ENV === "production" || e.VERCEL_TARGET_ENV === "production" || (reviewedOperator && !!e.VERCEL)) return deny();
  if (!local && !reviewedOperator && (e.VERCEL !== "1" || e.VERCEL_ENV !== "preview" || (e.VERCEL_TARGET_ENV && e.VERCEL_TARGET_ENV !== "preview") || e.VERCEL_PROJECT_ID !== e.COREOPS_STAGING_PROJECT_ID || !e.COREOPS_STAGING_BRANCH || e.VERCEL_GIT_COMMIT_REF !== e.COREOPS_STAGING_BRANCH)) return deny();
  const host = `${database.hostname.replace("-pooler.", ".")}:${database.port || "5432"}`;
  const clerkHost = Buffer.from((e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").slice(8), "base64").toString().replace(/\$$/, "");
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || host !== e.COREOPS_STAGING_DATABASE_HOST || decodeURIComponent(database.pathname.slice(1)) !== e.COREOPS_STAGING_DATABASE_NAME || (!local && (!["require", "verify-full"].includes(database.searchParams.get("sslmode") || "") || ["localhost", "127.0.0.1"].includes(database.hostname)))) return deny();
  if (!e.COREOPS_STAGING_ID || !/^prj_[a-zA-Z0-9]+$/.test(e.COREOPS_STAGING_PROJECT_ID || "") || !e.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") || !e.CLERK_SECRET_KEY?.startsWith("sk_test_") || clerkHost !== e.COREOPS_STAGING_CLERK_HOST || !/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(clerkHost)) return deny();
  if (origin.origin !== e.COREOPS_APP_ORIGIN || origin.username || origin.password || (!local && origin.protocol !== "https:") || (local && !["localhost", "127.0.0.1"].includes(origin.hostname))) return deny();
  if (e.PAYSTACK_LIVE_SECRET_KEY || e.PAYSTACK_LIVE_CHECKOUT_ENABLED === "true") return deny();
  for (const flag of ["COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED", "COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED", "COREOPS_LIFECYCLE_PROCESSING_ENABLED", "COREOPS_SECURE_EXPORTS_ENABLED", "COREOPS_NOTIFICATIONS_SEND_ENABLED", "COREOPS_RESEND_ENGINEERING_ENABLED"]) if (e[flag] === "true") return deny();
  return { id: e.COREOPS_STAGING_ID, projectId: e.COREOPS_STAGING_PROJECT_ID!, origin: origin.origin, databaseHost: host, databaseName: e.COREOPS_STAGING_DATABASE_NAME!, clerkHost, local };
}
