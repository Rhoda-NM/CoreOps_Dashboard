import { WorkspaceNavigation, type WorkspaceIdentity, type WorkspaceOption } from "./WorkspaceNavigation";

type SidebarProps = { workspace: WorkspaceIdentity; workspaces?: WorkspaceOption[]; role: string };
export function Sidebar({ workspace, workspaces, role }: SidebarProps) {
  return <aside className="workspace-sidebar" aria-label="Workspace sidebar">
    <WorkspaceNavigation workspace={workspace} workspaces={workspaces} role={role} label="Workspace navigation" />
  </aside>;
}
