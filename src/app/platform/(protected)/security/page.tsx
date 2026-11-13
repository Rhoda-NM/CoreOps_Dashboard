import Link from "next/link";
import { ShieldCheck, KeyRound, LockKeyhole, ArrowUpRight } from "lucide-react";
import { requirePlatform } from "@/server/commercial/platform-auth";
import { panel } from "@/components/commercial/Fields";
import { PageHeader } from "@/components/platform/PlatformUI";
export default async function SecurityPage() {
  const admin = await requirePlatform();
  return <section><PageHeader eyebrow="Identity & permissions" title="Administrator security" description="Manage your authentication methods and understand the boundaries of platform access."/><div className="platform-overview-grid"><section className={panel}><div className="platform-section-heading"><h2>Protected access</h2><ShieldCheck size={22} className="text-core-accent"/></div><div className="platform-info">Current platform role · <strong>{admin.role.replaceAll("_", " ")}</strong></div><div className="platform-shortcut"><span><KeyRound size={20}/></span><div><h3>Recent MFA verification</h3><p>Privileged pages and actions require fresh verification.</p></div></div><Link className="platform-button" href="/account">Manage account security <ArrowUpRight size={15}/></Link></section><section className={panel}><div className="platform-section-heading"><h2>Access boundaries</h2><LockKeyhole size={20}/></div><p className="platform-section-note">Platform privileges do not grant access to customer business records. Tenant operations require an explicitly authorized workspace membership.</p><p className="platform-section-note">Contact the platform operator for role revocation or recovery. Administrative role changes require privileged, audited maintenance.</p></section></div></section>;
}
