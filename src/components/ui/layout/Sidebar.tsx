import Link from "next/link";
import { dashboardNav } from "@/config/dashboard-nav";

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white px-4 py-6 lg:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight">CoreOps</h1>
        <p className="text-sm text-gray-500">Agency Operations</p>
      </div>

      <nav className="space-y-1">
        {dashboardNav.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}