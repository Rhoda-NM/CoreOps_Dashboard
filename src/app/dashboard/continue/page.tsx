import { notFound, redirect } from "next/navigation";
import { resolveWorkspaceContinuation } from "@/server/routing/continuation";

export default async function WorkspaceContinuation({ searchParams }: { searchParams: Promise<{ workspace?: string | string[]; path?: string | string[] }> }) {
  const query = await searchParams;
  const destination = await resolveWorkspaceContinuation(query.workspace, query.path);
  if (!destination) notFound();
  // A central GET/RSC transition precedes any cross-host navigation. Never
  // redirect a tenant mutation to another authority or write during prefetch.
  redirect(destination);
}
