import "server-only";
import { requireCommercialAccess } from "../commercial/access";
import { notFound } from "next/navigation";
import { workspaceRoutingContext } from "../routing/request-context";
import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "./get-current-user";
import { AccessError } from "../authorization/errors";

export async function getActiveMemberships() {
  const user = await getCurrentUser();
  return prisma.workspaceMember.findMany({ where: { userId: user.id, status: "ACTIVE" }, include: { workspace: true }, orderBy: { createdAt: "asc" } });
}

export async function getCurrentWorkspaceMembership() {
  const context = await workspaceRoutingContext();
  const { slug } = context;
  // Indexed existence check only; identity/membership/commercial checks stay
  // authoritative below. Unknown tenant pages fail neutrally before sign-in.
  if (context.policy.mode === "subdomain" && !await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) notFound();
  const user = await getCurrentUser();
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, status: "ACTIVE", workspace: { slug } },
    include: { user: true, workspace: true },
  });
  if (!member) throw new AccessError("FORBIDDEN");
  return member;
}
export async function getCurrentWorkspace() { return (await getCurrentWorkspaceMembership()).workspace; }
export async function getOperationalMembership(feature?: string) { const member = await getCurrentWorkspaceMembership(); await requireCommercialAccess(member.workspaceId, false, prisma, feature); return member; }
export async function getCurrentWorkspaceId() { return (await getOperationalMembership()).workspaceId; }
export async function workspacePath(path: string) {
  const { workspace } = await getCurrentWorkspaceMembership();
  return `/w/${encodeURIComponent(workspace.slug!)}${path}`;
}
