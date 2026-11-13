import { stagingRequested } from "@/server/staging/config";
import { processPaystackWebhook } from "@/server/payments/paystack";
import { CommercialError } from "@/server/commercial/policy";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ mode: string }> }) {
  const { mode } = await context.params;
  if ((stagingRequested() && mode !== "test") || (mode !== "test" && mode !== "live")) return new Response(null, { status: 404 });
  if (Number(request.headers.get("content-length")) > 262144) return new Response(null, { status: 413 });
  const chunks: Uint8Array[] = []; let size = 0;
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 262144) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(value); }
    await processPaystackWebhook(Buffer.concat(chunks), request.headers.get("paystack-signature"), request.headers.get("x-paystack-signature"), mode);
    return new Response(null, { status: 200 });
  } catch (error) {
    if (error instanceof CommercialError && error.message === "INVALID_SIGNATURE") return new Response(null, { status: 401 });
    return new Response(null, { status: 503 });
  }
}
