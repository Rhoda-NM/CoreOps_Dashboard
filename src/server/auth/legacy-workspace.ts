import "server-only";
import { workspaceContinuation } from "@/lib/routing/navigation";
import { requireCentralHost } from "../routing/request-context";
import { cookies } from "next/headers";
import { getActiveMemberships } from "./get-current-workspace";
export async function legacyWorkspacePath(path: string) {
  await requireCentralHost();
  const memberships = await getActiveMemberships();
  if (!memberships.length) return "/onboarding";
  const selected = (await cookies()).get("coreops-workspace")?.value;
  const member = memberships.length === 1 ? memberships[0] : memberships.find(m => m.workspace.slug === selected);
  return member ? workspaceContinuation(member.workspace.slug!, path) : "/dashboard";
}
