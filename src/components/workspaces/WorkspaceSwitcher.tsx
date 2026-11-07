"use client";
import { useNavigation } from "./NavigationProvider";
import { workspaceContinuation } from "@/lib/routing/navigation";
export function WorkspaceSwitcher({ current, workspaces }: { current: string; workspaces: { slug: string; name: string }[] }) {
  const { site } = useNavigation();
  if (workspaces.length < 2) return null;
  return <label className="block text-xs text-core-text-secondary">Switch workspace<select aria-label="Switch workspace" value={current} onChange={event => { window.location.assign(site(workspaceContinuation(event.target.value))); }} className="mt-1 block w-full rounded border border-core-border bg-core-surface p-2 text-core-text">{workspaces.map(workspace => <option key={workspace.slug} value={workspace.slug}>{workspace.name}</option>)}</select></label>;
}
