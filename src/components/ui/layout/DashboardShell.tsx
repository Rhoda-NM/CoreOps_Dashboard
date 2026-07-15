//src/components/ui/layout/DashboardShell.tsx
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  workspace: {
    id: string;
    name: string;
    slug: string | null;
  };
  user: {
    name: string | null;
    email: string;
    imageUrl: string | null;
    role: string;
  };
};

export function DashboardShell({
  children,
  workspace,
  user,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-core-bg text-core-text">
      <div className="flex min-h-0 flex-1">
        <Sidebar workspace={workspace} role={user.role} />

        <div className="flex min-h-0 flex-1 flex-col">
          <Header workspace={workspace} user={user} />

          <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

