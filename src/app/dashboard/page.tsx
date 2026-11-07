import { selectWorkspaceAction } from "@/features/workspaces/actions/select-workspace";
import { redirect } from "next/navigation";
import { getActiveMemberships } from "@/server/auth/get-current-workspace";
export default async function WorkspaceSelector() {
  const memberships = await getActiveMemberships();
  if (!memberships.length) redirect("/onboarding");
  if (memberships.length === 1) redirect(`/w/${encodeURIComponent(memberships[0].workspace.slug!)}/dashboard`);
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-core-text"><h1 className="text-2xl font-semibold">Choose a workspace</h1>{memberships.map(m => <form key={m.id} action={selectWorkspaceAction.bind(null, m.workspace.slug!)}><button className="block w-full rounded-xl border border-core-border p-4 text-left">{m.workspace.name} · {m.role}</button></form>)}</main>;
}
