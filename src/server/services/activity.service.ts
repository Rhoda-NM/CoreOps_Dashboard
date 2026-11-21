import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "../db/prisma";
import { requirePermission } from "../authorization/authorize";
import { AccessError } from "../authorization/errors";

export type AuditActivityEvent = { id: string; action: string; resourceType: string; resourceId: string; createdAt: string };
export type AuditActivityPage = { events: AuditActivityEvent[]; nextCursor: string | null; scopeKey: string };

function decodeCursor(value: unknown): { id: string; at: Date } {
  try {
    if (typeof value !== "string" || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (Object.keys(decoded).sort().join(",") !== "at,id,v" || decoded.v !== 1 || typeof decoded.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(decoded.id) || typeof decoded.at !== "string") throw new Error();
    const at = new Date(decoded.at);
    if (!Number.isFinite(+at) || at.toISOString() !== decoded.at) throw new Error();
    return { id: decoded.id, at };
  } catch { throw new AccessError("NOT_FOUND"); }
}

// Fixed bounded contract: five initially, twenty older events thereafter. No
// client-supplied workspace, page size, offset or arbitrary order is accepted.
export async function getAuditActivity(cursor?: unknown): Promise<AuditActivityPage> {
  const { workspaceId } = await requirePermission("audit:read");
  const anchor = cursor === undefined ? undefined : decodeCursor(cursor);
  if (anchor && !await prisma.auditLog.findFirst({ where: { id: anchor.id, workspaceId, createdAt: anchor.at }, select: { id: true } })) throw new AccessError("NOT_FOUND");
  const size = anchor ? 20 : 5;
  const rows = await prisma.auditLog.findMany({
    where: { workspaceId, ...(anchor ? { OR: [{ createdAt: { lt: anchor.at } }, { createdAt: anchor.at, id: { lt: anchor.id } }] } : {}) },
    select: { id: true, action: true, resourceType: true, resourceId: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: size + 1,
  });
  const page = rows.slice(0, size), last = page.at(-1);
  return {
    events: page.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
    nextCursor: rows.length > size && last ? Buffer.from(JSON.stringify({ v: 1, id: last.id, at: last.createdAt.toISOString() })).toString("base64url") : null,
    // Remount loaded client history when navigating to a different workspace.
    // This fingerprint is UI identity, never authorization or query scope.
    scopeKey: createHash("sha256").update(workspaceId).digest("hex"),
  };
}
