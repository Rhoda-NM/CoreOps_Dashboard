import { stagingRequested } from "@/server/staging/config";
import { PlatformShell, type PlatformLink } from "@/components/platform/PlatformShell";
import { marketRehearsalAvailable } from "@/server/market/config";
import { simulationAvailable } from "@/server/notifications/simulation-admin";
import { dataAccessEnabled } from "@/server/data-access/security";
import { redirect } from "next/navigation";
import { requirePlatform, platformCan, platformEntry } from "@/server/commercial/platform-auth";
export const dynamic = "force-dynamic";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const entry = await platformEntry();
  if (!entry.signedIn) redirect("/platform/sign-in");
  if (!entry.admin) redirect("/platform/access-denied");
  if (!entry.mfa) redirect(entry.canReverify ? "/platform/verify" : "/platform/access-denied");
  const admin = await requirePlatform();
  const candidates = [["", "Overview", "directory"], ["workspaces", "Workspaces", "directory"], ["requests", "Subscriptions", "billing"], ["payments", "Payments", "billing"], ["history", "Paid periods", "billing"], ["offers", "Plans & pricing", "catalog"], ["tax", "Tax configuration", "catalog"], ["audit", "Audit trail", "audit"], ["security", "Security", "directory"]] as const;
  const links: PlatformLink[] = candidates.filter(([, , permission]) => platformCan(admin.role, permission)).map(([path, label]) => ({ path, label, group: ["offers", "tax", "audit", "security"].includes(path) ? "Administration" : "Workspace" }));
  if (dataAccessEnabled() && platformCan(admin.role, "activate")) links.push({ path: "recovery", label: "Recovery review", group: "Administration" });
  if (simulationAvailable() && platformCan(admin.role, "audit")) links.push({ path: "notifications", label: "Notifications", group: "Administration" });
  if (marketRehearsalAvailable() && platformCan(admin.role, "activate")) links.push({ path: "market", label: "Market review", group: "Administration" });
  if (stagingRequested() && platformCan(admin.role, "activate")) links.push({ path: "users", label: "Accounts", group: "Administration" });
  const environment = stagingRequested() ? "Staging" : process.env.VERCEL_ENV === "preview" ? "Preview" : process.env.COREOPS_ENVIRONMENT === "production" ? "Production" : "Development";
  return <PlatformShell links={links} role={admin.role} environment={environment}>{children}</PlatformShell>;
}
