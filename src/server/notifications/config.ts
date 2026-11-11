import "server-only";
import { createHmac } from "node:crypto";
export const NOTIFICATION_POLICY = "NB-CAPTURE-v1";
export const EVIDENCE_POLICY = "UNAPPROVED-NO-DELIVERY-EVIDENCE";
export function requireNotificationRehearsal() {
  const url = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (process.env.VERCEL || process.env.VERCEL_ENV || !["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/coreops_auth_rehearsal_notifications_[a-z0-9_]+$/.test(url.pathname) || process.env.COREOPS_NOTIFICATIONS_CAPTURE_ENABLED !== "true" || process.env.COREOPS_NOTIFICATIONS_SEND_ENABLED === "true") throw new Error("Notification capture requires an isolated rehearsal; external sending is unavailable");
  const key = process.env.COREOPS_NOTIFICATION_DIGEST_KEY ?? "";
  if (Buffer.from(key, "base64").length !== 32 || Buffer.from(key, "base64").toString("base64") !== key) throw new Error("Notification digest configuration unavailable");
  return { providerScope: `capture:${url.pathname.slice(1)}`, keyVersion: `NB-v1:${createHmac("sha256", Buffer.from(key, "base64")).update("notification-lookup-key-version").digest("hex").slice(0, 24)}` };
}
export function digest(value: string, purpose = "identity") {
  requireNotificationRehearsal();
  return createHmac("sha256", Buffer.from(process.env.COREOPS_NOTIFICATION_DIGEST_KEY!, "base64")).update(`${purpose}:${value}`).digest("hex");
}
export function historyCutover() {
  const value = process.env.COREOPS_NOTIFICATION_HISTORY_CUTOVER_AT;
  if (!value || !/^\d{4}-\d\d-\d\dT.*Z$/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value);
}
