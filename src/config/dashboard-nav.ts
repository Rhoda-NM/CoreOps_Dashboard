import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  CheckSquare,
  Receipt,
  Activity,
  Settings,
} from "lucide-react";

export const dashboardNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: BriefcaseBusiness,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Activity",
    href: "/activity",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];