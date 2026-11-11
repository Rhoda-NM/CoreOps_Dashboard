import "server-only";

// B is intentionally incapable of enabling live-customer enforcement. Removing
// this rehearsal-only gate requires the separately reviewed Checkpoint C rollout.
export function lifecycleEnforcementEnabled() {
  if (process.env.COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED !== "true") return false;
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL ?? ""); } catch { throw new Error("Lifecycle rehearsal configuration required"); }
  if (process.env.VERCEL || process.env.VERCEL_ENV || !["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/coreops_auth_rehearsal_[a-z0-9_]+$/.test(url.pathname)) throw new Error("Lifecycle enforcement is restricted to isolated local rehearsal databases at Checkpoint B");
  return true;
}
export function lifecycleProcessingEnabled() {
  return process.env.COREOPS_LIFECYCLE_PROCESSING_ENABLED === "true" && lifecycleEnforcementEnabled();
}
