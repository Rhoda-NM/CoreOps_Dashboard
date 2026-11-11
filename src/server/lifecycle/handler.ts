import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireCentralHost } from "../routing/request-context";
import { runLifecycleBatch } from "./scheduler";
import { lifecycleProcessingEnabled } from "./config";

export async function lifecycleHandler(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    await requireCentralHost();
    const url = new URL(request.url);
    const dry = url.searchParams.get("dryRun");
    if (dry !== null && dry !== "true" && dry !== "false") return Response.json({ error: "Invalid parameters" }, { status: 400, headers });
    const dryRun = dry !== "false";
    if (!dryRun && !lifecycleProcessingEnabled()) return Response.json({ error: "Lifecycle processing disabled" }, { status: 503, headers });
    const limit = Number(url.searchParams.get("limit") ?? 25), after = url.searchParams.get("after") ?? undefined;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || (after?.length ?? 0) > 200) return Response.json({ error: "Invalid parameters" }, { status: 400, headers });
    return Response.json(await runLifecycleBatch({ dryRun, limit, after }), { headers });
  } catch {
    console.error("Lifecycle batch unavailable");
    return Response.json({ error: "Lifecycle batch unavailable" }, { status: 503, headers });
  }
}
