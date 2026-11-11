import "server-only";
import { pay1Enabled, pay1Target } from "../preview/pay1-config";
import { AccessError } from "../authorization/errors";
// No production admission path. PAY-1 additionally requires durable scoped admission.
export function requireMarketRehearsal() {
  if (pay1Enabled()) { pay1Target(); return; }
  const url = new URL(process.env.DATABASE_URL || "invalid:");
  if (process.env.COREOPS_MARKET_REHEARSAL_ENABLED !== "true" || process.env.VERCEL || process.env.VERCEL_ENV || !["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/coreops_auth_rehearsal_market_[a-z0-9_]+$/.test(url.pathname)) throw new AccessError("FORBIDDEN");
}

export function marketRehearsalAvailable() { try { requireMarketRehearsal(); return true; } catch { return false; } }
