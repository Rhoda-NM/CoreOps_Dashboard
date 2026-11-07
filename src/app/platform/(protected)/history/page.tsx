import { platformHistory } from "@/server/commercial/service";
import { panel } from "@/components/commercial/Fields";
export default async function HistoryPage() {
  const rows = await platformHistory();
  return <section className="space-y-4"><h1 className="text-3xl font-semibold">Subscription period history</h1><p className="text-core-muted">Latest 100 periods. Early renewals begin at the current paid-through date.</p>{rows.map(p => <article key={p.id} className={panel}><h2 className="font-semibold">{p.plan} · {p.interval} · {p.currency} {p.agreedAmount.toFixed(2)}</h2><p>{p.startsAt.toISOString()} – {p.endsAt.toISOString()}</p><p className="text-sm text-core-muted">Workspace {p.workspaceId} · Request {p.sourceRequestId} · Grace ends {p.graceEndsAt.toISOString()} · {p.memberLimit} members{p.revokedAt ? " · Revoked" : ""}</p></article>)}</section>;
}
