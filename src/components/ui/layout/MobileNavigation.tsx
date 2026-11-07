"use client";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "@/components/workspaces/WorkspaceLink";
import { usePathname } from "next/navigation";
import { visibleDashboardNav } from "@/config/dashboard-nav";
export function MobileNavigation({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname().replace(/^\/w\/[^/]+/, "");
  return <div className="lg:hidden"><button ref={button} aria-expanded={open} aria-controls="workspace-mobile-navigation" aria-label={open ? "Close workspace navigation" : "Open workspace navigation"} type="button" onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-core-border">{open ? <X size={19}/> : <Menu size={19}/>}</button><nav id="workspace-mobile-navigation" aria-label="Workspace navigation" hidden={!open} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } }} className="absolute inset-x-0 top-full z-30 border-b border-core-border bg-core-surface p-4 shadow-xl">{visibleDashboardNav(role).map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm hover:bg-core-card aria-[current=page]:bg-core-card"><item.icon aria-hidden="true" size={17}/>{item.title}</Link>)}</nav></div>;
}
