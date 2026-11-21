import { centralUrl } from "@/lib/routing/host-policy";
import { runtimeRoutingPolicy } from "@/server/routing/config";
import { UserButton } from "@clerk/nextjs";
import { MobileNavigation } from "./MobileNavigation";
import type { WorkspaceIdentity, WorkspaceOption } from "./WorkspaceNavigation";
import { workspaceRoleLabel } from "@/config/dashboard-nav";
type HeaderProps = {
  workspace: WorkspaceIdentity;
  workspaces?: WorkspaceOption[];
  user: { name: string | null; email: string; imageUrl: string | null; role: string };
};
export function Header({ workspace, workspaces, user }: HeaderProps) {
  const role = workspaceRoleLabel(user.role);
  return <header className="workspace-header">
    <div className="workspace-header-context">
      <MobileNavigation workspace={workspace} workspaces={workspaces} role={user.role} />
      <div className="workspace-header-title"><p>Workspace</p><h2 title={workspace.name}>{workspace.name}</h2></div>
    </div>
    <div className="workspace-header-account">
      <div className="workspace-user-details"><p title={user.name || user.email}>{user.name || user.email}</p><span>{role}</span></div>
      <span className="workspace-mobile-role">{role}</span>
      <UserButton userProfileMode="navigation" userProfileUrl={centralUrl(runtimeRoutingPolicy(), "/account")} />
    </div>
  </header>;
}
