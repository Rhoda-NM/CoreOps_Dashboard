import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  CheckSquare,
  Receipt,
  Activity,
  Settings,
} from "lucide-react";

export const dashboardNavGroups = [
  { id: "overview", title: "Overview" },
  { id: "work", title: "Your work" },
  { id: "finances", title: "Business finances" },
  { id: "workspace", title: "Workspace" },
] as const;

export const dashboardNav = [
  {
    title: "Dashboard",
    group: "overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    group: "work",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Projects",
    group: "work",
    href: "/projects",
    icon: BriefcaseBusiness,
  },
  {
    title: "Tasks",
    group: "work",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Invoices",
    group: "finances",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Activity",
    group: "workspace",
    href: "/activity",
    icon: Activity,
  },
  {
    title: "Settings",
    group: "workspace",
    href: "/settings",
    icon: Settings,
  },
];
// Presentation only; server permissions remain authoritative and unchanged.
export function visibleDashboardNav(role: string) {
  return dashboardNav.filter(item => !(role === "STAFF" && ["/clients", "/settings", "/activity"].includes(item.href)) && !(role !== "OWNER" && ["/invoices", "/settings", "/activity"].includes(item.href)));
}

// Group only the already-visible links; no new permission or route authority.
export function groupedDashboardNav(role: string) {
  const visible = visibleDashboardNav(role);
  return dashboardNavGroups.map(group => ({
    ...group,
    items: visible.filter(item => item.group === group.id),
  })).filter(group => group.items.length > 0);
}

export function isDashboardNavActive(pathname: string, href: string) {
  const path = pathname.replace(/^\/w\/[^/]+/, "");
  return path === href || path.startsWith(`${href}/`);
}

export function workspaceRoleLabel(role: string) {
  return role.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}
