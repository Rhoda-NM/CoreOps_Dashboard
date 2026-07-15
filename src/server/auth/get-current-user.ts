import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";

export async function getCurrentUser() {
  const { userId: externalId } = await auth();

  if (!externalId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Error("The signed-in account has no primary email address.");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const existingUserByExternalId = await prisma.user.findUnique({
    where: {
      externalId,
    },
  });

  if (existingUserByExternalId) {
    return prisma.user.update({
      where: {
        externalId,
      },
      data: {
        email,
        name,
        imageUrl: clerkUser.imageUrl,
      },
    });
  }

  const existingUserByEmail = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUserByEmail) {
    return prisma.user.update({
      where: {
        email,
      },
      data: {
        externalId,
        name,
        imageUrl: clerkUser.imageUrl,
      },
    });
  }

  return prisma.user.create({
    data: {
      externalId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
    },
  });
}