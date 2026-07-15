//src/app/%28onboarding%29/onboarding/page.tsx
import { redirect } from "next/navigation";

import { WorkspaceOnboardingForm } from "@/features/workspaces/components/WorkSpaceOnboardingForm";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { prisma } from "@/server/db/prisma";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
    },
    select: {
      workspaceId: true,
    },
  });

  if (existingMembership) {
    redirect("/dashboard");
  }

  const defaultWorkspaceName = user.name
    ? `${user.name}'s Workspace`
    : "My Workspace";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B101D] px-6 py-12">
      <WorkspaceOnboardingForm defaultName={defaultWorkspaceName} />
    </main>
  );
}