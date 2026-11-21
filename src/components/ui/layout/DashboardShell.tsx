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
  workspaces?: { slug: string; name: string }[];
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
  workspaces,
  user,
}: DashboardShellProps) {
  return (
    <div className="workspace-theme workspace-shell">
      <div className="workspace-shell-row">
        <Sidebar workspace={workspace} workspaces={workspaces} role={user.role} />

        <div className="workspace-shell-main">
          <Header workspace={workspace} workspaces={workspaces} user={user} />

          <main className="workspace-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

