"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "@/server/auth/get-current-user";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is required."),
});

export type CreateWorkspaceState = {
  error: string;
};

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createWorkspaceAction(
  _previousState: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> {
  const result = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });

  if (!result.success) {
    return {
      error:
        result.error.flatten().fieldErrors.name?.[0] ??
        "Enter a valid workspace name.",
    };
  }

  const user = await getCurrentUser();

  const baseSlug = createSlug(result.data.name) || "workspace";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      if (await transaction.workspaceMember.findFirst({ where: { userId: user.id, status: "ACTIVE" } })) return;
      const workspace = await transaction.workspace.create({
        data: {
          name: result.data.name,
          slug,
          activationStatus: "PENDING_ACTIVATION",
          subscription: { create: { status: "PENDING_ACTIVATION" } },
        },
      });

      await transaction.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "OWNER",
        },
      });
      await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: user.id, action: "WORKSPACE_CREATED", resourceType: "Workspace", resourceId: workspace.id } });
    });
  } catch (error) {
    console.error("Workspace creation failed:", error);

    return {
      error: "Unable to create your workspace. Please try again.",
    };
  }

  redirect("/dashboard");
}