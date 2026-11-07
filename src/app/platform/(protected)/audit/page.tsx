import { platformAuditHistory } from "@/server/commercial/service";
import { panel } from "@/components/commercial/Fields";
export default async function AuditPage() {
  const rows = await platformAuditHistory();
  return <section className="space-y-4"><h1 className="text-3xl font-semibold">Platform audit history</h1><p className="text-core-muted">Latest 100 commercial and administration events.</p>{rows.map(e => <article className={panel} key={e.id}><h2 className="font-semibold">{e.action.replaceAll("_"," ")}</h2><p className="text-sm text-core-muted">{e.createdAt.toISOString()} · {e.resourceId} · {e.workspaceId ?? "Platform"}</p>{"reason" in e && <p>{String(e.reason)}</p>}</article>)}</section>;
}
