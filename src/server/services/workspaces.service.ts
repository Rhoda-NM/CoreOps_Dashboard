import "server-only";
import { z } from "zod";
import { workspaceMutation, audit } from "../authorization/authorize";
export async function renameWorkspace(name: unknown) {
  const validName = z.string().trim().min(2).max(120).parse(name);
  return workspaceMutation("workspace:manage", async (tx, actor) => {
    const workspace = await tx.workspace.update({ where: { id: actor.workspaceId }, data: { name: validName } });
    await audit(tx, actor, "WORKSPACE_RENAMED", "Workspace", workspace.id);
    return workspace;
  });
}
