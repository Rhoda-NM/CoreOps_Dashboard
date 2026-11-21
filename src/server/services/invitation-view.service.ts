import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "../db/prisma";
import { requireCentralHost } from "../routing/request-context";
import { getCurrentUser } from "../auth/get-current-user";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { requireCommercialAccess, requireInvitationCapacity } from "../commercial/access";
import { CommercialError } from "../commercial/policy";
import { workspaceContinuation } from "@/lib/routing/navigation";
import type { InvitationView } from "@/features/memberships/invitation-view";

// A copied bearer link does not establish the recipient's identity. Before
// matching a live verified identity, disclose no workspace name, role or full email.
export async function getInvitationView(token: string): Promise<InvitationView> {
  await requireCentralHost();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { state: "UNAVAILABLE" };
  try {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash: createHash("sha256").update(token).digest("hex") },
      select: { id: true, workspaceId: true, email: true, role: true, status: true, expiresAt: true },
    });
    if (!invitation || invitation.status === "REVOKED") return { state: "UNAVAILABLE" };
    if (invitation.status === "PENDING" && invitation.expiresAt <= new Date()) return { state: "EXPIRED" };
    const maskedEmail = `${Array.from(invitation.email)[0]}•••@•••`;
    const publicDetails = { maskedEmail, expiresAt: invitation.expiresAt.toISOString() };
    if (!(await auth()).userId) return { state: "SIGN_IN", ...publicDetails };
    // Retains staging admission, local binding, current legal receipt and the
    // synthetic testing acknowledgment. This never creates a workspace.
    const user = await getCurrentUser();
    const profile = await requireClerkIdentity();
    if (profile.id !== user.externalId || !profile.emailAddresses.some(e => e.verification?.status === "verified" && e.emailAddress.toLowerCase() === invitation.email)) return { state: "WRONG_ACCOUNT", ...publicDetails };
    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } }, select: { status: true } });
    if (member?.status === "SUSPENDED") return { state: "SUSPENDED" };
    if (invitation.status === "ACCEPTED" && !member) return { state: "UNAVAILABLE" };
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: invitation.workspaceId }, select: { name: true, slug: true } });
    const details = { ...publicDetails, workspaceName: workspace.name, role: invitation.role, email: invitation.email };
    try {
      await requireCommercialAccess(invitation.workspaceId, true, prisma);
      if (invitation.status === "PENDING") await requireInvitationCapacity(invitation.workspaceId, prisma, invitation.id, member ? 0 : 1);
    } catch (error) {
      if (error instanceof CommercialError) return { state: "RESTRICTED", ...details };
      throw error;
    }
    if (invitation.status === "ACCEPTED") return workspace.slug ? { state: "ACCEPTED", ...details, continuation: workspaceContinuation(workspace.slug) } : { state: "UNAVAILABLE" };
    return { state: "READY", ...details };
  } catch (error) {
    unstable_rethrow(error);
    // Neither provider/DB exceptions nor token/email details enter responses/logs.
    return { state: "ACCOUNT_UNAVAILABLE" };
  }
}
