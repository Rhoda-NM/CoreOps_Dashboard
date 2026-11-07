import "server-only";
import { requireCommercialAccess } from "../commercial/access";
import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "./get-current-user";
import { AccessError } from "../authorization/errors";

export async function getActiveMemberships() {
  const user = await getCurrentUser();
  return prisma.workspaceMember.findMany({ where: { userId: user.id, status: "ACTIVE" }, include: { workspace: true }, orderBy: { createdAt: "asc" } });
}

export async function getCurrentWorkspaceMembership() {
  const slug = (await headers()).get("x-coreops-workspace");
  if (!slug) throw new AccessError("FORBIDDEN");
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
