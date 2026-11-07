import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyPaystackSignature(raw: Buffer, modern: string | null, legacy: string | null, config: { secret: string; webhookSecret?: string; allowLegacy: boolean }, now = Date.now()) {
  const equal = (a: string, b: string) => /^[0-9a-f]{128}$/.test(b) && timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  if (modern !== null) {
    if (!config.webhookSecret?.startsWith("whsec_") || modern.length > 2048) return false;
    const parts = modern.split(",").map(p => p.trim());
    const timestamps = parts.filter(p => p.startsWith("t="));
    if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0])) return false;
    const t = timestamps[0].slice(2);
    if (Math.abs(now / 1000 - Number(t)) > 300) return false;
    const hash = createHmac("sha512", config.webhookSecret).update(`${t}.`).update(raw).digest("hex");
    return parts.filter(p => p.startsWith("v1=")).some(p => { const pair = p.slice(3).split(":"); return pair.length === 2 && /^whk_[a-zA-Z0-9]+$/.test(pair[0]) && equal(hash, pair[1]); });
  }
  if (!config.allowLegacy || !legacy) return false;
  return equal(createHmac("sha512", config.secret).update(raw).digest("hex"), legacy);
}
