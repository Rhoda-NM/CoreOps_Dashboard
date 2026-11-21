"use client";

import {
  Activity, BriefcaseBusiness, Building2, CalendarDays,
  CheckSquare, Clock3, FileText, History, Mail, ShieldCheck,
  UserRound, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { AuditActivityPage } from "@/server/services/activity.service";
import { loadOlderActivity } from "./actions";

const timeZone = "Africa/Nairobi";
const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "long", timeZone });
const timeFormatter = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", timeZone });
const dayFormatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone });

const eventLabels: Record<string, { title: string; description: string }> = {
  WORKSPACE_CREATED: { title: "Workspace created", description: "A new home for your team and business operations." },
  WORKSPACE_RENAMED: { title: "Workspace name updated", description: "The workspace display name was changed." },
  INVITATION_CREATED: { title: "Invitation link created", description: "A private invitation link was created for a teammate." },
  INVITATION_ACCEPTED: { title: "Invitation accepted", description: "A teammate accepted an invitation to this workspace." },
  INVITATION_REVOKED: { title: "Invitation revoked", description: "A pending invitation was withdrawn." },
  MEMBERSHIP_CHANGED: { title: "Membership updated", description: "A member’s role, status, or job title was updated." },
  MEMBERSHIP_REMOVED: { title: "Member removed", description: "A team member’s workspace access was removed." },
  PROJECT_MEMBER_ADDED: { title: "Project teammate added", description: "A workspace member was assigned to a project." },
  PROJECT_MEMBER_REMOVED: { title: "Project teammate removed", description: "A workspace member was removed from a project team." },
  TASK_ASSIGNMENT_CHANGED: { title: "Task assignment updated", description: "A task’s assignee or team visibility was changed." },
  CLIENT_CREATED: { title: "Client added", description: "A new client record was created." },
  CLIENT_UPDATED: { title: "Client details updated", description: "An existing client record was edited." },
  CLIENT_ARCHIVED: { title: "Client archived", description: "A client was moved out of the active client list." },
  PROJECT_CREATED: { title: "Project created", description: "A new project was added to the workspace." },
  PROJECT_UPDATED: { title: "Project details updated", description: "An existing project was edited." },
  PROJECT_STATUS_UPDATED: { title: "Project status changed", description: "A project’s delivery status was updated." },
  TASK_CREATED: { title: "Task created", description: "A new task was added to a project." },
  TASK_UPDATED: { title: "Task details updated", description: "A task’s title or description was edited." },
  TASK_STATUS_UPDATED: { title: "Task progress updated", description: "A task moved to a different status." },
  INVOICE_CREATED: { title: "Invoice created", description: "A new invoice was recorded in the workspace." },
  INVOICE_STATUS_UPDATED: { title: "Invoice status changed", description: "An invoice’s billing status was updated." },
};

const resources: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  Workspace: { label: "Workspace", icon: Building2, color: "bg-indigo-500/10 text-core-accent ring-indigo-500/20" },
  WorkspaceInvitation: { label: "Invitation", icon: Mail, color: "bg-blue-500/10 text-blue-300 ring-blue-500/20" },
  WorkspaceMember: { label: "Membership", icon: UserRound, color: "bg-violet-500/10 text-violet-300 ring-violet-500/20" },
  Client: { label: "Client", icon: Users, color: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20" },
  Project: { label: "Project", icon: BriefcaseBusiness, color: "bg-amber-500/10 text-amber-300 ring-amber-500/20" },
  Task: { label: "Task", icon: CheckSquare, color: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" },
  Invoice: { label: "Invoice", icon: FileText, color: "bg-orange-500/10 text-orange-300 ring-orange-500/20" },
};

function readableName(value: string) {
  const words = value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ActivityHistory({ initialPage }: { initialPage: AuditActivityPage }) {
  const [records, setRecords] = useState(initialPage.events);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const busy = useRef(false);
  const end = useRef<HTMLParagraphElement>(null);
  async function showMore() {
    if (!cursor || busy.current) return;
    busy.current = true; setPending(true); setError(""); setAnnouncement("Loading older activity…");
    try {
      const result = await loadOlderActivity(cursor);
      if (!result.success || result.page.scopeKey !== initialPage.scopeKey) {
        setError(result.success ? "The selected workspace changed. Reload this page." : result.message);
        setAnnouncement(""); return;
      }
      const ids = new Set(records.map(event => event.id));
      const added = result.page.events.filter(event => !ids.has(event.id));
      setRecords(previous => [...previous, ...added]); setCursor(result.page.nextCursor);
      setAnnouncement(`${added.length} older events added. ${records.length + added.length} events shown.`);
      requestAnimationFrame(() => {
        if (added[0]) document.getElementById(`activity-event-${added[0].id}`)?.focus();
        else end.current?.focus();
      });
    } catch { setError("Connection interrupted. Your loaded activity is unchanged. Try again."); setAnnouncement(""); }
    finally { busy.current = false; setPending(false); }
  }
  const events = records.map(event => ({ ...event, createdAt: new Date(event.createdAt) }));
  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const key = dayFormatter.format(event.createdAt);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  const teamChanges = events.filter(event => event.action.startsWith("MEMBERSHIP_") || event.action.startsWith("INVITATION_") || event.action.startsWith("PROJECT_MEMBER_") || event.action === "TASK_ASSIGNMENT_CHANGED").length;
  const resourceCount = new Set(events.map(event => `${event.resourceType}:${event.resourceId}`)).size;

  return (
    <main className="min-w-0 space-y-5 pb-8 [overflow-wrap:anywhere]">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-core-accent">Workspace / Activity</p>
          <h1 className="text-3xl font-semibold tracking-tight text-core-text">Workspace activity</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-core-text-secondary">A clear history of the changes that keep your workspace moving.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-core-border bg-core-card px-3 py-2 text-xs text-core-text-secondary"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />Owner access</span>
      </header>

      <section aria-label="Summary of loaded events" className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-core-border bg-core-card px-4 py-3 text-xs text-core-text-secondary">
        <p><strong className="text-core-text">{events.length}</strong> events shown</p>
        <p><strong className="text-core-text">{teamChanges}</strong> team &amp; access changes shown</p>
        <p><strong className="text-core-text">{resourceCount}</strong> records affected in this view</p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="timeline-heading" className="overflow-hidden rounded-2xl border border-core-border bg-core-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-core-border px-5 py-4 sm:px-6">
            <h2 id="timeline-heading" className="flex items-center gap-2 text-sm font-semibold"><History aria-hidden="true" className="h-4 w-4 text-core-accent" />Activity timeline</h2>
            <span className="text-xs text-core-muted">Newest first</span>
          </div>
          {events.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-core-primary/10 text-core-accent"><History aria-hidden="true" className="h-6 w-6" /></div>
            <h3 className="text-base font-semibold">No activity recorded yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-core-text-secondary">Workspace updates, team changes, and new work will appear here as they happen.</p>
          </div> : <div className="activity-timeline-groups grid p-4 sm:p-5">{Array.from(groups.entries()).map(([day, group]) => <section key={day} aria-label={dateFormatter.format(group[0].createdAt)}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-core-text-secondary"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-core-muted" />{dateFormatter.format(group[0].createdAt)}<span className="ml-1 rounded-md bg-core-surface px-1.5 py-0.5 text-[10px] text-core-muted">{group.length}</span></h3>
            <ol className="space-y-0">{group.map((event, index) => {
              const resource = resources[event.resourceType] ?? { label: readableName(event.resourceType), icon: Activity, color: "bg-indigo-500/10 text-core-accent ring-indigo-500/20" };
              const presentation = eventLabels[event.action] ?? { title: readableName(event.action), description: "A change was recorded in this workspace." };
              const Icon = resource.icon;
              return <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0 sm:gap-4">
                {index < group.length - 1 && <div aria-hidden="true" className="absolute bottom-0 left-[19px] top-11 w-px bg-core-border" />}
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${resource.color}`}><Icon aria-hidden="true" className="h-4 w-4" /></div>
                <article id={`activity-event-${event.id}`} tabIndex={-1} className="activity-event min-w-0 flex-1 rounded-xl border border-core-border/60 bg-core-surface/50 transition hover:border-core-border hover:bg-core-surface">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><h4 className="text-sm font-medium text-core-text">{presentation.title}</h4><time dateTime={event.createdAt.toISOString()} title={`${dateFormatter.format(event.createdAt)}, ${timeFormatter.format(event.createdAt)} EAT`} className="shrink-0 text-xs tabular-nums text-core-muted">{timeFormatter.format(event.createdAt)}</time></div>
                  <p className="mt-1.5 text-xs leading-5 text-core-text-secondary">{presentation.description}</p>
                  <span className="mt-3 inline-flex rounded-md border border-core-border/70 px-2 py-0.5 text-[10px] font-medium text-core-text-secondary">{resource.label}</span>
                </article>
              </li>;
            })}</ol>
          </section>)}</div>}
          <div className="border-t border-core-border px-5 py-4 sm:px-6">
            <p role="status" aria-live="polite" className="mb-2 text-sm text-core-text-secondary">{announcement}</p>
            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            {cursor ? <button type="button" onClick={showMore} disabled={pending} aria-busy={pending} className="min-h-11 rounded-lg bg-core-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{pending ? "Loading activity…" : "Show more activity"}</button>
              : <p ref={end} tabIndex={-1} className="text-sm text-core-text-secondary">{events.length ? "You’ve reached the beginning of the recorded history." : "No older activity to show."}</p>}
          </div>
          <div className="flex items-start gap-2 border-t border-core-border px-5 py-3 text-[11px] leading-5 text-core-muted sm:px-6"><Clock3 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Times shown in East Africa Time (UTC+3).</p></div>
        </section>

        <aside className="space-y-3">
          <section className="activity-guide rounded-xl border border-core-border bg-core-card">
            <h2 className="text-sm font-semibold">About this history</h2>
            <p className="mt-2 text-xs text-core-text-secondary">Recorded changes for this workspace, available to its owners. The summary counts only the events currently shown.</p>
            <p className="mt-2 text-xs text-core-text-secondary">Load older events below the timeline. Reload the page for new activity.</p>
            {events[0] && <p className="mt-3 border-t border-core-border pt-3 text-xs text-core-muted">Latest shown: <time dateTime={events[0].createdAt.toISOString()}>{dateFormatter.format(events[0].createdAt)}, {timeFormatter.format(events[0].createdAt)} EAT</time></p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
