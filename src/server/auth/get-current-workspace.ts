import { prisma } from "@/server/db/prisma";

export async function getCurrentWorkspaceId() {
  const user = await prisma.user.findUnique({
    where: { email: "rhoda@coreops.dev" },
    include: {
      memberships: true,
    },
  });

  if (!user || user.memberships.length === 0) {
    throw new Error("No workspace found");
  }

  return user.memberships[0].workspaceId;
}