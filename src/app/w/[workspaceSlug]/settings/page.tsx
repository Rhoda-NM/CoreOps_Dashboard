import { workspaceNavigationPath } from "@/server/routing/request-context";
import Link from "next/link";
import { commercialAccess } from "@/server/commercial/access";
import { LegalLinks } from "@/components/auth/LegalLinks";
import { Building2, Clock3, CreditCard, LockKeyhole, Mail, ShieldCheck, Users } from "lucide-react";
import { renameWorkspaceAction } from "@/features/workspaces/actions/rename-workspace";
import { requirePermission } from "@/server/authorization/authorize";
import { prisma } from "@/server/db/prisma";
import { listMembers } from "@/server/services/memberships.service";
import { InvitationForm } from "@/features/memberships/InvitationForm";
import { SettingsForm } from "@/features/workspaces/components/SettingsForm";
import { Input } from "@/components/ui/Input";
import { changeMemberAction, removeMemberAction, revokeInvitationAction } from "@/features/memberships/actions";

const selectClass = "h-[38px] w-full rounded-lg border border-core-border bg-core-surface px-3 text-sm text-core-text outline-none transition focus:border-core-primary focus:ring-2 focus:ring-core-primary/30 disabled:cursor-not-allowed disabled:opacity-50";
const roleLabels = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

export default async function SettingsPage() {
  const actor = await requirePermission("workspace:manage");
  const [members, invitations, subscription] = await Promise.all([
    listMembers(),
    prisma.workspaceInvitation.findMany({ where: { workspaceId: actor.workspaceId, status: "PENDING", expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true } }),
    prisma.subscription.findUnique({ where: { workspaceId: actor.workspaceId }, select: { plan: true, status: true } }),
  ]);
  const access = await commercialAccess(actor.workspaceId);
  const subscriptionHref = await workspaceNavigationPath("/subscription");
  const activeMembers = members.filter(member => member.status === "ACTIVE").length;
  const activeOwners = members.filter(member => member.status === "ACTIVE" && member.role === "OWNER").length;

  return (
    <main className="space-y-8 pb-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-core-accent">Workspace / Settings</p><h1 className="text-3xl font-semibold tracking-tight text-core-text">Workspace settings</h1><p className="mt-2 text-sm text-core-text-secondary">Manage your workspace details, team access, and subscription.</p></div>
        <div className="flex flex-wrap gap-2 text-xs text-core-text-secondary"><span className="inline-flex items-center gap-2 rounded-full border border-core-border bg-core-card px-3 py-2"><Users aria-hidden="true" className="h-3.5 w-3.5 text-core-accent" />{activeMembers} active {activeMembers === 1 ? "member" : "members"}</span><span className="inline-flex items-center gap-2 rounded-full border border-core-border bg-core-card px-3 py-2"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />Owner access</span></div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section aria-labelledby="details-heading" className="rounded-2xl border border-core-border bg-core-card p-5 sm:p-6">
          <div className="mb-6 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-core-primary/10 text-core-accent"><Building2 aria-hidden="true" className="h-5 w-5" /></div><div><h2 id="details-heading" className="font-semibold">Workspace details</h2><p className="mt-1 text-sm text-core-text-secondary">The name your team sees across WorkflowConnect.</p></div></div>
          <SettingsForm action={renameWorkspaceAction} label="Save changes" successMessage="Workspace name updated."><Input id="workspace-name" name="name" label="Workspace name" defaultValue={actor.workspace.name} minLength={2} maxLength={120} required /><p className="text-xs text-core-muted">Renaming your workspace keeps your existing links and data.</p></SettingsForm>
        </section>
        <section aria-labelledby="subscription-heading" className="overflow-hidden rounded-2xl border border-core-border bg-core-card">
          <div className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-core-text-secondary"><CreditCard aria-hidden="true" className="h-4 w-4" /><h2 id="subscription-heading">Subscription</h2></div><span className="rounded-full border border-core-border bg-core-surface px-2.5 py-1 text-[11px] text-core-text-secondary">{subscription ? subscription.status.replaceAll("_", " ") : "Not configured"}</span></div><p className="text-2xl font-semibold tracking-tight">{subscription ? `${(access.period?.plan ?? subscription.plan).charAt(0)}${(access.period?.plan ?? subscription.plan).slice(1).toLowerCase()}` : "No subscription yet"}</p><p className="mt-2 text-sm leading-6 text-core-text-secondary">Your subscription belongs to this workspace.</p></div>
          <div className="flex items-start gap-2 border-t border-core-border bg-core-surface/50 px-5 py-4 text-xs leading-5 text-core-muted sm:px-6"><Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>Seat limits are enforced for memberships and outstanding invitations.</p></div>
        </section>
      </div>

      <section aria-labelledby="team-heading" className="space-y-5">
        <div><h2 id="team-heading" className="text-lg font-semibold">Team & access</h2><p className="mt-1 text-sm text-core-text-secondary">Invite people and choose what they can do in this workspace.</p></div>
        {access.write && access.period?.invitationsEnabled && access.period.plan !== "SOLO" ? <InvitationForm /> : <section className="rounded-2xl border border-core-border bg-core-card p-6"><h2 className="font-semibold">Team invitations unavailable</h2><p className="mt-2 text-sm text-core-text-secondary">Solo supports one owner. An eligible paid subscription and available seats are required for invitations.</p><Link className="mt-4 inline-block text-sm text-core-accent underline" href={subscriptionHref}>Review subscription or request an upgrade</Link></section>}
        <section aria-labelledby="members-heading" className="overflow-hidden rounded-2xl border border-core-border bg-core-card">
          <div className="flex items-center justify-between border-b border-core-border px-5 py-4 sm:px-6"><h3 id="members-heading" className="text-sm font-semibold">Workspace members <span className="ml-2 rounded-md bg-core-surface px-2 py-0.5 text-xs text-core-text-secondary">{members.length}</span></h3><p className="text-xs text-core-muted">Roles apply to this workspace</p></div>
          <div className="divide-y divide-core-border">{members.map(member => {
            const lastOwner = activeOwners === 1 && member.role === "OWNER" && member.status === "ACTIVE";
            const self = member.userId === actor.userId;
            const initials = (member.user.name || member.user.email).split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
            return <article key={member.id} className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-core-accent">{initials}</div><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-sm font-medium">{member.user.name || member.user.email}{self && <span className="rounded border border-core-border px-1.5 py-0.5 text-[10px] font-normal text-core-muted">You</span>}</p><p className="mt-0.5 break-all text-xs text-core-text-secondary">{member.user.email}</p></div></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{member.status === "ACTIVE" ? "Active" : "Suspended"}</span></div>
              <SettingsForm action={changeMemberAction.bind(null, member.id)} label="Save member" successMessage="Membership updated.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
                  <div className="grid gap-2"><label htmlFor={`role-${member.id}`} className="text-sm font-medium">Role</label><select id={`role-${member.id}`} name="role" defaultValue={member.role} disabled={lastOwner} className={selectClass}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{lastOwner && <input type="hidden" name="role" value={member.role} />}</div>
                  <div className="grid gap-2"><label htmlFor={`status-${member.id}`} className="text-sm font-medium">Membership status</label><select id={`status-${member.id}`} name="status" defaultValue={member.status} disabled={lastOwner} className={selectClass}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select>{lastOwner && <input type="hidden" name="status" value={member.status} />}</div>
                  <Input id={`job-${member.id}`} name="jobTitle" label="Job title" maxLength={120} defaultValue={member.jobTitle ?? ""} placeholder="e.g. Project manager" />
                </div>
              </SettingsForm>
              {lastOwner ? <p className="flex items-start gap-2 text-xs leading-5 text-core-muted"><LockKeyhole aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-core-accent" />This is the last active owner. Assign another owner before changing this role, suspending, or removing this member.</p> : <details className="border-t border-core-border pt-3"><summary className="w-fit cursor-pointer text-xs text-red-300 transition hover:text-red-200">Remove member</summary><div className="mt-3 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"><p className="text-sm text-core-text-secondary">This person will lose access to this workspace. Reassign their tasks before removing them.</p><SettingsForm action={removeMemberAction.bind(null, member.id)} label="Confirm removal" pendingLabel="Removing…" successMessage="Member removed." danger /></div></details>}
            </article>;
          })}</div>
        </section>
      </section>

      <section aria-labelledby="pending-heading" className="overflow-hidden rounded-2xl border border-core-border bg-core-card">
        <div className="flex items-center gap-2 border-b border-core-border px-5 py-4 sm:px-6"><h2 id="pending-heading" className="text-sm font-semibold">Pending invitations</h2><span className="rounded-md bg-core-surface px-2 py-0.5 text-xs text-core-text-secondary">{invitations.length}</span></div>
        {invitations.length === 0 ? <div className="flex flex-col items-center px-5 py-9 text-center"><div className="mb-3 rounded-full bg-core-surface p-3 text-core-muted"><Mail aria-hidden="true" className="h-5 w-5" /></div><h3 className="text-sm font-medium">No pending invitations</h3><p className="mt-1 max-w-sm text-xs leading-5 text-core-text-secondary">New invitations will appear here until they are accepted, revoked, or expire.</p></div> : <div className="divide-y divide-core-border">{invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6"><div><p className="break-all text-sm font-medium">{invitation.email}</p><p className="mt-1 text-xs text-core-muted">Invited as {roleLabels[invitation.role].toLowerCase()}</p></div><SettingsForm action={revokeInvitationAction.bind(null, invitation.id)} label="Revoke invitation" pendingLabel="Revoking…" successMessage="Invitation revoked." danger /></div>)}</div>}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-core-border pt-5"><Link href="/account" className="text-sm text-core-accent underline underline-offset-4">Profile & account security</Link><Link href={subscriptionHref} className="text-sm text-core-accent underline">Manage subscription</Link><LegalLinks /></footer>
    </main>
  );
}
