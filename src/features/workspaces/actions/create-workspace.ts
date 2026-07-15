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

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    redirect("/dashboard");
  }

  const baseSlug = createSlug(result.data.name) || "workspace";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: {
          name: result.data.name,
          slug,
        },
      });

      await transaction.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "OWNER",
        },
      });
    });
  } catch (error) {
    console.error("Workspace creation failed:", error);

    return {
      error: "Unable to create your workspace. Please try again.",
    };
  }

  redirect("/dashboard");
}