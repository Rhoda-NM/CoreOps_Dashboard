import "server-only";
import { reverificationErrorResponse } from "@clerk/nextjs/server";
import { requireCentralHost } from "../routing/request-context";
import { downloadExport, releaseDownload } from "./exports";
import { sensitiveIdentity, StepUpRequired } from "./security";
export const downloadHeaders = { "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
function boundedStream(bytes: Buffer, id: string, workspaceId: string,leaseToken:string) {
  let data: Buffer | null = bytes, offset = 0, timer: ReturnType<typeof setTimeout>;
  const finish = async () => { data = null; clearTimeout(timer); await releaseDownload(id, workspaceId,leaseToken).catch(() => {}); };
  return new ReadableStream<Uint8Array>({
    start(controller) { timer = setTimeout(() => { controller.error(new Error("Download timed out")); void finish(); }, 25000); },
    async pull(controller) {
      if (!data) return;
      const end = Math.min(offset + 65536, data.length);
      controller.enqueue(new Uint8Array(data.subarray(offset, end))); offset = end;
      if (offset === data.length) { controller.close(); await finish(); }
    },
    async cancel() { await finish(); }
  });
}
export async function exportDownloadHandler(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const routing = await requireCentralHost();
    if (request.headers.get("origin") !== new URL(routing.policy.appOrigin).origin || !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return Response.json({ error: "Unavailable" }, { status: 403, headers: downloadHeaders });
    await sensitiveIdentity();
    const reader = request.body?.getReader(); if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 2048) { await reader.cancel(); return Response.json({ error: "Unavailable" }, { status: 413, headers: downloadHeaders }); } chunks.push(value); }
    const { id } = await context.params;
    const token = new URLSearchParams(Buffer.concat(chunks).toString("utf8")).get("token") ?? "";
    const result = await downloadExport(id, token);
    return new Response(boundedStream(result.bytes, result.id, result.workspaceId,result.leaseToken), { headers: { ...downloadHeaders, "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="workflowconnect-workspace-export.zip"', "Content-Length": String(result.bytes.length) } });
  } catch (error) {
    if (error instanceof StepUpRequired) { const response = reverificationErrorResponse("strict_mfa"); for (const [k, v] of Object.entries(downloadHeaders)) response.headers.set(k, v); return response; }
    return Response.json({ error: "Export unavailable. Verify your identity and current authorization, or request a new export." }, { status: 403, headers: downloadHeaders });
  }
}
