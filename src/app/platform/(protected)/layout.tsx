import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlatform, platformCan, platformEntry } from "@/server/commercial/platform-auth";
export const dynamic = "force-dynamic";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const entry = await platformEntry();
  if (!entry.signedIn) redirect("/platform/sign-in");
  if (!entry.admin || !entry.mfa) redirect("/platform/access-denied");
  const admin = await requirePlatform();
  const links = [["", "Overview", "directory"], ["workspaces", "Subscribers", "directory"], ["requests", "Requests", "billing"], ["payments", "Payments", "billing"], ["history", "Periods", "billing"], ["offers", "Plans & accounts", "catalog"], ["tax", "VAT configuration", "catalog"], ["audit", "Audit", "audit"], ["security", "Security", "directory"]] as const;
  return <main className="min-h-screen bg-core-bg px-5 py-8 text-core-text"><div className="mx-auto max-w-7xl space-y-8"><header className="space-y-4 border-b border-core-border pb-6"><div className="flex flex-wrap justify-between gap-4"><Link className="text-xl font-semibold" href="/platform">WorkflowConnect · Platform administration</Link><span className="text-sm text-core-muted">{admin.role} · MFA required</span></div><nav aria-label="Platform navigation" className="flex flex-wrap gap-5 text-sm">{links.filter(([, , permission]) => platformCan(admin.role, permission)).map(([path,label]) => <Link key={path} href={`/platform/${path}`}>{label}</Link>)}<Link href="/dashboard">My workspaces</Link></nav></header>{children}</div></main>;
}
