"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, Building2, CheckCheck, CircleHelp, ClipboardList, CreditCard, FileClock, Gauge, Layers3, Menu, ReceiptText, ShieldCheck, SlidersHorizontal, Users, Workflow } from "lucide-react";
const icons = { "": Gauge, workspaces: Building2, requests: ClipboardList, payments: CreditCard, history: FileClock, offers: Layers3, tax: ReceiptText, audit: Activity, security: ShieldCheck, users: Users, market: SlidersHorizontal, recovery: CircleHelp, notifications: CheckCheck };
export type PlatformLink = { path: string; label: string; group: "Workspace" | "Administration" };
export function PlatformShell({ children, links, role, environment }: { children: React.ReactNode; links: PlatformLink[]; role: string; environment: string }) {
  const pathname = usePathname();
  const current = links.find(link => pathname === `/platform${link.path ? `/${link.path}` : ""}`);
  const navigation = <>{(["Workspace", "Administration"] as const).map(group => <div className="platform-nav-group" key={group}><p>{group}</p>{links.filter(link => link.group === group).map(link => {
    const Icon = icons[link.path as keyof typeof icons] ?? Layers3;
    const href = `/platform${link.path ? `/${link.path}` : ""}`;
    return <Link key={link.path} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={18} aria-hidden="true"/>{link.label}</Link>;
  })}</div>)}</>;
  return <div className="platform-shell"><a href="#platform-content" className="platform-skip">Skip to content</a><aside className="platform-sidebar"><Link href="/platform" className="platform-brand"><span><Workflow size={23}/></span><div>WorkflowConnect<small>Administration</small></div></Link><nav aria-label="Platform navigation">{navigation}</nav><div className="platform-sidebar-footer"><div><ShieldCheck size={18}/><span>Protected administrative access<small>Recent MFA verification required</small></span></div><Link href="/dashboard">My workspaces <ArrowUpRight size={16}/></Link></div></aside><div className="platform-main"><header className="platform-topbar"><div className="platform-breadcrumb">Platform <span>/</span> <strong>{current?.label ?? "Administration"}</strong></div><div className="platform-topbar-meta"><span className="platform-environment">{environment}</span><span className="platform-role">{role.replaceAll("_", " ").toLowerCase()}</span></div></header><details className="platform-mobile-nav"><summary><Menu size={18}/> Platform navigation <span>{current?.label}</span></summary><nav aria-label="Mobile platform navigation">{navigation}<Link href="/dashboard">My workspaces ↗</Link></nav></details><main id="platform-content" tabIndex={-1} className="platform-content">{children}</main><footer className="platform-footer"><span>WorkflowConnect · Platform administration</span><span>Customer business records remain tenant-scoped.</span></footer></div></div>;
}
