import "server-only";
import { AccessError } from "../authorization/errors";
export function requireLegalRehearsal() {
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL || "invalid:"); } catch { throw new AccessError("FORBIDDEN"); }
  if (process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED !== "true" || process.env.VERCEL || process.env.VERCEL_ENV || !["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/coreops_auth_rehearsal_(legal|market_legal)_[a-z0-9_]+$/.test(url.pathname)) throw new AccessError("FORBIDDEN");
}
export function legalRehearsalAvailable() { try { requireLegalRehearsal(); return true; } catch { return false; } }
