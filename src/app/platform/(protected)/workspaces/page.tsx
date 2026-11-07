import { platformDirectory } from "@/server/commercial/service";
import { requirePlatform, platformCan } from "@/server/commercial/platform-auth";
import { CommercialForm } from "@/components/commercial/CommercialForm";
import { Field, Select, panel } from "@/components/commercial/Fields";
import { platformAction } from "../actions";
export default async function SubscribersPage() {
  const admin = await requirePlatform(), rows = await platformDirectory();
  return <section className="space-y-4"><h1 className="text-3xl font-semibold">Workspace directory</h1><p className="text-sm text-core-muted">Latest 100 businesses. Counts include suspended members.</p>{rows.map(w => <article className={panel} key={w.id}><h2 className="text-lg font-semibold">{w.name}</h2><p className="text-sm">{w.activationStatus} · {w.subscription?.plan ?? "Unconfigured"} · {w._count.members} members</p><p className="text-xs text-core-muted">{w.id} · Paid through {w.subscription?.currentPeriodEnd?.toISOString() ?? "No paid period"}</p>{platformCan(admin.role,"activate") && !["PENDING_ACTIVATION","CLOSED"].includes(w.activationStatus) && <CommercialForm action={platformAction} label="Apply workspace status"><input type="hidden" name="operation" value="status"/><input type="hidden" name="id" value={w.id}/><Select name="status" label="Status"><option value="SUSPENDED">Suspend operations</option><option value="ACTIVE">Reactivate eligible paid workspace</option><option value="CLOSED">Close workspace (preserve data)</option></Select><Field label="Reason and approval evidence" name="reason"/></CommercialForm>}</article>)}</section>;
}
