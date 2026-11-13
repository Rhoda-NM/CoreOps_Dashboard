//src/app/%28onboarding%29/onboarding/page.tsx
import { requireCentralHost } from "@/server/routing/request-context";
import { redirect } from "next/navigation";

import { WorkspaceOnboardingForm } from "@/features/workspaces/components/WorkSpaceOnboardingForm";
import { accountEntry } from "@/server/auth/account-entry";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { randomUUID } from "node:crypto";
import { countryCodes } from "@/server/market/service";
import { prisma } from "@/server/db/prisma";

export default async function OnboardingPage() {
  const { policy } = await requireCentralHost();
  const user = await accountEntry(getCurrentUser);

  const existingMembership = await accountEntry(() => prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    select: {
      workspaceId: true,
    },
  }));

  if (existingMembership) {
    redirect("/dashboard");
  }

  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countryOptions = countryCodes.map(code => ({ code, name: names.of(code) ?? code }));
  const defaultWorkspaceName = "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0E2425] px-6 py-12">
      <WorkspaceOnboardingForm requestKey={randomUUID()} countryOptions={countryOptions} defaultName={defaultWorkspaceName} addressDomain={policy.tenantRootDomain ?? "workflowconnect.io"} addressPrefix={policy.mode === "path" ? `${policy.appOrigin}/w/` : undefined} />
    </main>
  );
}