import "server-only";
import { prisma } from "../db/prisma";
import { getCurrentUser } from "../auth/get-current-user";
import { requireCentralHost } from "../routing/request-context";
import { workspaceContinuation } from "@/lib/routing/navigation";

export async function paymentReturnPath(reference: unknown) {
  await requireCentralHost();
  const user = await getCurrentUser();
  if (typeof reference !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(reference)) return "/dashboard";
  // Only the original payer who remains an ACTIVE owner gets a destination.
  // Unknown/foreign references give identical, nonspecific fallback content.
  const attempt = await prisma.paystackAttempt.findFirst({
    where: { reference, payment: { submittedByUserId: user.id, workspace: { members: { some: { userId: user.id, status: "ACTIVE", role: "OWNER" } } } } },
    select: { payment: { select: { workspace: { select: { slug: true } } } } },
  });
  return attempt?.payment.workspace.slug ? workspaceContinuation(attempt.payment.workspace.slug, "/subscription") : "/dashboard";
}
