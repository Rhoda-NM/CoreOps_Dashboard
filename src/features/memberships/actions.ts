"use server";
import { redirect } from "next/navigation";
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
    return { error: "", path: `/invitations/${invitation.token}` };
  } catch {
    return { error: "Unable to create this invitation. Check your permissions and input.", path: "" };
  }
}
export async function acceptInvitationAction(token: string) {
  const workspaceId = await acceptInvitation(token);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { slug: true } });
  redirect(`/w/${encodeURIComponent(workspace.slug!)}/dashboard`);
}
