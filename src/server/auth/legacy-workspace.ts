import "server-only";
import { cookies } from "next/headers";
import { getActiveMemberships } from "./get-current-workspace";
export async function legacyWorkspacePath(path: string) {
  const memberships = await getActiveMemberships();
  if (!memberships.length) return "/onboarding";
  const selected = (await cookies()).get("coreops-workspace")?.value;
  const member = memberships.length === 1 ? memberships[0] : memberships.find(m => m.workspace.slug === selected);
  return member ? `/w/${encodeURIComponent(member.workspace.slug!)}${path}` : "/dashboard";
}
