import Link from "next/link";
import { requirePlatform } from "@/server/commercial/platform-auth";
import { panel } from "@/components/commercial/Fields";
export default async function SecurityPage() {
  const admin = await requirePlatform();
  return <section className={panel}><h1 className="text-3xl font-semibold">Administrator security</h1><p>Your platform role is {admin.role}. Active administrator authorization and recent MFA verification are required for platform access.</p><p>Platform privileges do not grant access to customer business records. Use only an explicitly authorized workspace membership for tenant operations.</p><Link className="text-indigo-400 underline" href="/account">Manage authentication methods, MFA, and account security</Link><p className="text-sm text-core-muted">Contact the platform operator for role revocation or recovery. Administrative role changes require privileged, audited maintenance.</p></section>;
}
