import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireCentralHost } from "../routing/request-context";
import { cleanupDataAccess } from "./exports";
import { dataAccessEnabled } from "./security";
export async function exportCleanupHandler(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  const secret = process.env.CRON_SECRET, value = Buffer.from(request.headers.get("authorization") ?? ""), expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || secret.length < 32 || value.length !== expected.length || !timingSafeEqual(value, expected)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    await requireCentralHost();
    if (!dataAccessEnabled()) return Response.json({ error: "Disabled" }, { status: 503, headers });
    return Response.json(await cleanupDataAccess(new URL(request.url).searchParams.get("after")??undefined), { headers });
  } catch { return Response.json({ error: "Cleanup unavailable" }, { status: 503, headers }); }
}
