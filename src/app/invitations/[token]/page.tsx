import { acceptInvitationFormAction } from "@/features/memberships/actions";
import { InvitationCard } from "@/features/memberships/InvitationCard";
import { getInvitationView } from "@/server/services/invitation-view.service";
import { requireCentralHost } from "@/server/routing/request-context";
import { centralUrl } from "@/lib/routing/host-policy";
import { safeAuthReturn } from "@/lib/routing/navigation";

export const dynamic = "force-dynamic";
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { policy } = await requireCentralHost();
  const { token } = await params;
  const view = await getInvitationView(token);
  const intent = safeAuthReturn(`/invitations/${token}`);
  const query = new URLSearchParams({ returnTo: intent });
  return <div className="workspace-theme min-h-screen"><InvitationCard initialView={view} signInHref={centralUrl(policy, `/sign-in?${query}`)} signUpHref={centralUrl(policy, `/sign-up?${query}`)} acceptAction={acceptInvitationFormAction.bind(null, token)} /></div>;
}
