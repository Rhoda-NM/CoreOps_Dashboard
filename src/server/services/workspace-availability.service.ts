import "server-only";
import { selectedWorkspaceSlugMessage } from "@/lib/routing/workspace-slug";
import { requireCentralHost } from "../routing/request-context";
import { getCurrentUser } from "../auth/get-current-user";
import { prisma } from "../db/prisma";
import { consumeSlugCheck } from "../routing/slug-check-limit";
export type SlugAvailability = { status: "available" | "unavailable" | "invalid" | "rate-limited"; message: string };
export async function checkWorkspaceSlugAvailability(slug: unknown): Promise<SlugAvailability> {
  await requireCentralHost();
  const invalid = selectedWorkspaceSlugMessage(slug);
  if (invalid) return { status: "invalid", message: invalid };
  const user = await getCurrentUser();
  if (!consumeSlugCheck(user.id)) return { status: "rate-limited", message: "Too many checks. Please wait a minute and try again." };
  const exists = await prisma.workspace.findUnique({ where: { slug: slug as string }, select: { id: true } });
  return exists ? { status: "unavailable", message: "This address is unavailable. Please choose another." } : { status: "available", message: "This address is available. It is reserved only when you create your workspace." };
}
