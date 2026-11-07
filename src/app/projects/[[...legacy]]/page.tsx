import { redirect } from "next/navigation";
import { legacyWorkspacePath } from "@/server/auth/legacy-workspace";
export default async function LegacyPage({ params }: { params: Promise<{ legacy?: string[] }> }) {
  const { legacy = [] } = await params;
  redirect(await legacyWorkspacePath("/projects" + (legacy.length ? "/" + legacy.map(encodeURIComponent).join("/") : "")));
}
