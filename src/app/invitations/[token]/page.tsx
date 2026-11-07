import { acceptInvitationAction } from "@/features/memberships/actions";
import { getCurrentUser } from "@/server/auth/get-current-user";
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  await getCurrentUser();
  const { token } = await params;
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-core-text"><h1 className="text-2xl font-semibold">Join a workspace</h1><p>Accept using the account with the verified email address that received this invitation.</p><form action={acceptInvitationAction.bind(null, token)}><button className="rounded border p-3">Accept invitation</button></form></main>;
}
