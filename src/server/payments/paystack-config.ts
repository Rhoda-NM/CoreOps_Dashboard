import "server-only";
import { stagingRequested, stagingTarget } from "../staging/config";
import { runtimeRoutingPolicy } from "../routing/config";
import { createHash } from "node:crypto";
import { CommercialError } from "../commercial/policy";
import { pay1Target, pay1Enabled } from "../preview/pay1-config";
export type GatewayMode = "test" | "live";
export function paystackConfig(mode: GatewayMode, initialize = false) {
  if (mode !== "test" && mode !== "live") throw new CommercialError("Invalid payment environment.");
  if (stagingRequested()) { stagingTarget(); if (mode !== "test") throw new CommercialError("Staging accepts Test Mode only."); }
  else if (pay1Enabled() || process.env.VERCEL_ENV === "preview") { pay1Target(); if (mode !== "test") throw new CommercialError("Preview accepts Test Mode only."); }
  const prefix = `PAYSTACK_${mode.toUpperCase()}_`;
  const secret = process.env[`${prefix}SECRET_KEY`] ?? "";
  const merchantId = process.env[`${prefix}MERCHANT_ID`] ?? "";
  const currency = process.env[`${prefix}CURRENCY`] ?? "KES";
  const channels = (process.env[`${prefix}CHANNELS`] ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!secret.startsWith(`sk_${mode}_`) || !/^[a-zA-Z0-9_-]+$/.test(merchantId) || currency !== "KES") throw new CommercialError("Payment provider is not configured for this environment.");
  if (mode === "test" && (process.env.COREOPS_ENVIRONMENT === "production" || process.env.VERCEL_ENV === "production")) throw new CommercialError("Test payments cannot fund production subscription requests.");
  if (mode === "live" && (process.env.COREOPS_ENVIRONMENT !== "production" || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"))) throw new CommercialError("Live payment credentials are restricted to production.");
  if (initialize && (process.env[`${prefix}CHECKOUT_ENABLED`] !== "true" || !channels.length || !channels.every(c => ["card", "bank", "bank_transfer", "mobile_money", "ussd", "qr"].includes(c)) || !process.env[`${prefix}CAPABILITIES_APPROVAL`] || !process.env[`${prefix}SETTLEMENT_APPROVAL`])) throw new CommercialError("Checkout is disabled pending merchant, channel, and settlement verification.");
  const base = new URL(runtimeRoutingPolicy().appOrigin);
  if (process.env.COREOPS_PUBLIC_URL) {
    const legacy = new URL(process.env.COREOPS_PUBLIC_URL);
    if (legacy.origin !== base.origin || legacy.username || legacy.password || legacy.pathname !== "/" || legacy.search || legacy.hash) throw new CommercialError("Payment return origin must match the configured central application.");
  }
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/" || (base.protocol !== "https:" && !(mode === "test" && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new CommercialError("A verified application origin is required.");
  return { mode, secret, merchantId, currency, channels, origin: base.origin, keyFingerprint: createHash("sha256").update(secret).digest("hex"), webhookSecret: process.env[`${prefix}WEBHOOK_SECRET`], allowLegacy: process.env[`${prefix}ALLOW_LEGACY_SIGNATURE`] === "true" };
}
