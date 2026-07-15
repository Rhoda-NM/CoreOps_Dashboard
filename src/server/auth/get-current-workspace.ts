// src/server/auth/get-current-workspace.ts
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "./get-current-user";

export async function getCurrentWorkspaceMembership() {
  const user = await getCurrentUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      user: true,
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  return membership;
}

export async function getCurrentWorkspace() {
  const membership = await getCurrentWorkspaceMembership();

  return membership.workspace;
}

export async function getCurrentWorkspaceId() {
  const membership = await getCurrentWorkspaceMembership();

  return membership.workspaceId;
}