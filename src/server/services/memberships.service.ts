import "server-only";
import { requireInvitationCapacity, requireCommercialAccess } from "../commercial/access";
import { createHash, randomBytes } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getCurrentUser } from "../auth/get-current-user";
import { requirePermission, workspaceMutation, audit } from "../authorization/authorize";
import { AccessError } from "../authorization/errors";
const roleSchema = z.enum(["OWNER", "MANAGER", "STAFF"]);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function listMembers() {
  const { workspaceId } = await requirePermission("members:manage");
  return prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } });
}
export async function changeMembership(memberId: string, input: { role?: unknown; status?: unknown; jobTitle?: unknown }) {
  const change = z.object({ role: roleSchema.optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional(), jobTitle: z.string().trim().max(120).nullable().optional() }).strict().parse(input);
  return workspaceMutation("members:manage", async (tx, actor) => {
    const target = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId: actor.workspaceId } });
    if (!target) throw new AccessError("NOT_FOUND");
    if (target.role === "OWNER" && target.status === "ACTIVE" && ((change.role && change.role !== "OWNER") || change.status === "SUSPENDED")) {
      const owners = await tx.workspaceMember.count({ where: { workspaceId: actor.workspaceId, role: "OWNER", status: "ACTIVE" } });
      if (owners <= 1) throw new AccessError("CONFLICT");
    }
    if (change.role === "STAFF" && target.role !== "STAFF") {
      const unassignedProjectTasks = await tx.task.count({ where: { workspaceId: actor.workspaceId, assignedMemberId: target.id, project: { projectMembers: { none: { memberId: target.id } } } } });
      if (unassignedProjectTasks) throw new AccessError("CONFLICT");
    }
    const entitlement = await requireCommercialAccess(actor.workspaceId, true, tx);
    if (entitlement.plan === "SOLO" && change.role && change.role !== "OWNER") throw new AccessError("CONFLICT");
    const updated = await tx.workspaceMember.update({ where: { id: target.id, workspaceId: actor.workspaceId }, data: change });
    await audit(tx, actor, "MEMBERSHIP_CHANGED", "WorkspaceMember", target.id, { beforeRole: target.role, beforeStatus: target.status, role: updated.role, status: updated.status });
    return updated;
  });
}
export async function removeMembership(memberId: string) {
  return workspaceMutation("members:manage", async (tx, actor) => {
    const target = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId: actor.workspaceId } });
    if (!target) throw new AccessError("NOT_FOUND");
    if (target.role === "OWNER" && target.status === "ACTIVE" && await tx.workspaceMember.count({ where: { workspaceId: actor.workspaceId, role: "OWNER", status: "ACTIVE" } }) <= 1) throw new AccessError("CONFLICT");
    if (await tx.task.count({ where: { workspaceId: actor.workspaceId, assignedMemberId: target.id } })) throw new AccessError("CONFLICT");
    await tx.workspaceMember.delete({ where: { id: target.id, workspaceId: actor.workspaceId } });
    await audit(tx, actor, "MEMBERSHIP_REMOVED", "WorkspaceMember", target.id);
  });
}
export async function createInvitation(input: { email: unknown; role: unknown }) {
  const data = z.object({ email: z.string().trim().email().transform(s => s.toLowerCase()), role: roleSchema }).parse(input);
  const token = randomBytes(32).toString("base64url");
  return workspaceMutation("members:invite", async (tx, actor) => {
    // Reissuing an invitation revokes older pending links for this identity.
    await tx.workspaceInvitation.updateMany({ where: { workspaceId: actor.workspaceId, email: data.email, status: "PENDING" }, data: { status: "REVOKED" } });
    await requireInvitationCapacity(actor.workspaceId, tx);
    const invitation = await tx.workspaceInvitation.create({ data: { ...data, workspaceId: actor.workspaceId, inviterUserId: actor.userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    await audit(tx, actor, "INVITATION_CREATED", "WorkspaceInvitation", invitation.id, { role: data.role });
    return { id: invitation.id, token };
  });
}
export async function revokeInvitation(invitationId: string) {
  return workspaceMutation("members:invite", async (tx, actor) => {
    const result = await tx.workspaceInvitation.updateMany({ where: { id: invitationId, workspaceId: actor.workspaceId, status: "PENDING" }, data: { status: "REVOKED" } });
    if (!result.count) throw new AccessError("NOT_FOUND");
    await audit(tx, actor, "INVITATION_REVOKED", "WorkspaceInvitation", invitationId);
  });
}
export async function acceptInvitation(token: string) {
  z.string().min(40).max(100).parse(token);
  const user = await getCurrentUser();
  const profile = await currentUser();
  if (!profile || profile.id !== user.externalId || profile.banned || profile.locked) throw new AccessError("FORBIDDEN");
  const verifiedEmails = profile?.emailAddresses.filter(e => e.verification?.status === "verified").map(e => e.emailAddress.toLowerCase()) ?? [];
  return prisma.$transaction(async tx => {
    const initial = await tx.workspaceInvitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!initial) throw new AccessError("NOT_FOUND");
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${initial.workspaceId} FOR UPDATE`;
    const invitation = await tx.workspaceInvitation.findUniqueOrThrow({ where: { id: initial.id } });
    if (!verifiedEmails.includes(invitation.email)) throw new AccessError("FORBIDDEN");
    const existing = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } } });
    if (existing?.status === "SUSPENDED") throw new AccessError("FORBIDDEN");
    await requireCommercialAccess(invitation.workspaceId, true, tx);
    // Replay is safe for the verified identity, but never changes an existing role.
    if (invitation.status === "ACCEPTED" && existing) return invitation.workspaceId;
    if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) throw new AccessError("CONFLICT");
    await requireInvitationCapacity(invitation.workspaceId, tx, invitation.id, existing ? 0 : 1);
    const member = existing ?? await tx.workspaceMember.create({ data: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role } });
    await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
    await audit(tx, member, "INVITATION_ACCEPTED", "WorkspaceMember", member.id);
    return invitation.workspaceId;
  });
}
