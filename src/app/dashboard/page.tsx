import { requireCentralHost } from "@/server/routing/request-context";
import { workspaceContinuation } from "@/lib/routing/navigation";
import { selectWorkspaceAction } from "@/features/workspaces/actions/select-workspace";
import { redirect } from "next/navigation";
import { getActiveMemberships } from "@/server/auth/get-current-workspace";
import { accountEntry } from "@/server/auth/account-entry";
export default async function WorkspaceSelector() {
  await requireCentralHost();
  const memberships = await accountEntry(getActiveMemberships);
  if (!memberships.length) redirect("/onboarding");
  if (memberships.length === 1) redirect(workspaceContinuation(memberships[0].workspace.slug!));
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-core-text"><h1 className="text-2xl font-semibold">Choose a workspace</h1>{memberships.map(m => <form key={m.id} action={selectWorkspaceAction.bind(null, m.workspace.slug!)}><button className="block w-full rounded-xl border border-core-border p-4 text-left">{m.workspace.name} · {m.role}</button></form>)}</main>;
}
