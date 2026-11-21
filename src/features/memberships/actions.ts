"use server";
import { centralUrl } from "@/lib/routing/host-policy";
import { workspaceContinuation } from "@/lib/routing/navigation";
import { runtimeRoutingPolicy } from "@/server/routing/config";
import { unstable_rethrow, redirect } from "next/navigation";
import { revalidateWorkspacePath } from "@/server/auth/revalidate-workspace";
import { acceptInvitation, changeMembership, createInvitation, removeMembership, revokeInvitation } from "@/server/services/memberships.service";
import { prisma } from "@/server/db/prisma";

export async function changeMemberAction(id: string, form: FormData) {
  await changeMembership(id, { role: form.get("role"), status: form.get("status"), jobTitle: form.get("jobTitle") || null });
  await revalidateWorkspacePath("/settings");
}
export async function removeMemberAction(id: string) {
  await removeMembership(id);
  await revalidateWorkspacePath("/settings");
}
export async function revokeInvitationAction(id: string) {
  await revokeInvitation(id);
  await revalidateWorkspacePath("/settings");
}
export async function inviteAction(_previous: { error: string; path: string }, form: FormData) {
  try {
    const invitation = await createInvitation({ email: form.get("email"), role: form.get("role") });
    await revalidateWorkspacePath("/settings");
    return { error: "", path: centralUrl(runtimeRoutingPolicy(), `/invitations/${invitation.token}`) };
  } catch {
    return { error: "Unable to create this invitation. Check your permissions and input.", path: "" };
  }
}
export async function acceptInvitationAction(token: string) {
  const workspaceId = await acceptInvitation(token);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { slug: true } });
  redirect(workspaceContinuation(workspace.slug!));
}

// Friendly recoverable errors for the invitation page; the existing service is
// still the only membership mutation and independently rechecks every condition.
export async function acceptInvitationFormAction(token: string): Promise<import("./invitation-view").InvitationAcceptanceState> {
  try { await acceptInvitationAction(token); }
  catch (error) {
    unstable_rethrow(error);
    const { getInvitationView } = await import("@/server/services/invitation-view.service");
    return { message: "The invitation could not be accepted. Review its current status below. If it is still available, try again or ask the workspace owner for help.", view: await getInvitationView(token) };
  }
  return { message: "Unable to continue. Please reload the invitation." };
}
