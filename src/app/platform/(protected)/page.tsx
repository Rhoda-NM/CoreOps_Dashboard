import { platformMetrics } from "@/server/commercial/service";
import { panel } from "@/components/commercial/Fields";
export default async function PlatformOverview() {
  const counts = await platformMetrics();
  const metrics = [["Active paid subscribers", counts.active], ["Awaiting activation", counts.pending], ["Expiring within 14 days", counts.expiring], ["Past paid-through date", counts.expired], ...(counts.pendingRequests === null ? [] : [["Open commercial requests", counts.pendingRequests]])];
  return <section className="space-y-6"><h1 className="text-3xl font-semibold">Subscriber overview</h1><p className="text-core-muted">Counts cover all workspaces. Paid periods, grace, and workspace suspension govern access. Customer business records are outside platform administration.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,count]) => <article key={String(label)} className={panel}><p className="text-sm text-core-muted">{label}</p><p className="text-3xl font-semibold">{count}</p></article>)}</div></section>;
}
