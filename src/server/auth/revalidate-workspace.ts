import "server-only";
import { revalidatePath } from "next/cache";
import { workspacePath } from "./get-current-workspace";
export async function revalidateWorkspacePath(path: string) {
  // Caller-provided cache paths are constrained to this workspace's resources.
  if (!/^\/(dashboard|clients|projects|tasks|invoices|activity|settings)(\/|$)/.test(path) || path.includes("..")) return;
  revalidatePath(await workspacePath(path));
}
