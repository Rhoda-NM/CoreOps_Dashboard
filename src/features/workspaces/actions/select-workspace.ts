"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveMemberships } from "@/server/auth/get-current-workspace";
import { AccessError } from "@/server/authorization/errors";
export async function selectWorkspaceAction(slug: string) {
  const memberships = await getActiveMemberships();
  if (!memberships.some(m => m.workspace.slug === slug)) throw new AccessError("FORBIDDEN");
  (await cookies()).set("coreops-workspace", slug, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  redirect(`/w/${encodeURIComponent(slug)}/dashboard`);
}
