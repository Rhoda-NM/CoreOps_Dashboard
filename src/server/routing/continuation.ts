import "server-only";
import { requireCentralHost } from "./request-context";
import { getActiveMemberships } from "../auth/get-current-workspace";
import { workspaceUrl } from "@/lib/routing/host-policy";
import { workspaceContinuation } from "@/lib/routing/navigation";

export async function resolveWorkspaceContinuation(slug: unknown, path: unknown = "/dashboard") {
  const { policy } = await requireCentralHost();
  if (typeof slug !== "string" || typeof path !== "string") return null;
  try { workspaceContinuation(slug, path); } catch { return null; }
  const memberships = await getActiveMemberships();
  if (!memberships.some(member => member.workspace.slug === slug)) return null;
  // The destination layout rechecks membership and current commercial access.
  return workspaceUrl(policy, slug, path);
}
