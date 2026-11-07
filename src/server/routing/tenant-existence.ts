import "server-only";
import { prisma } from "../db/prisma";
// Existence only, not authorization. No account/subscription status or member
// data is selected, and results are not cached across requests or tenants.
export async function tenantExists(slug: string): Promise<boolean> {
  return !!await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
}
