"use client";
import { useTransition } from "react";
import { selectWorkspaceAction } from "@/features/workspaces/actions/select-workspace";
export function WorkspaceSwitcher({ current, workspaces }: { current: string; workspaces: { slug: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  if (workspaces.length < 2) return null;
  return <label className="block text-xs text-core-text-secondary">Switch workspace<select aria-label="Switch workspace" value={current} disabled={pending} onChange={e => { const slug = e.target.value; startTransition(() => selectWorkspaceAction(slug)); }} className="mt-1 block w-full rounded border border-core-border bg-core-surface p-2 text-core-text">{workspaces.map(w => <option key={w.slug} value={w.slug}>{w.name}</option>)}</select></label>;
}
