import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IdentityError } from "./identity-error";

export async function requireClerkIdentity({ allowUnverifiedEmail = false }: { allowUnverifiedEmail?: boolean } = {}) {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) redirect("/sign-in");
  let profile;
  try {
    // A live check rejects a known revoked session instead of relying only on
    // an otherwise unexpired JWT. React.cache at the caller deduplicates this.
    const client = await clerkClient();
    const session = await client.sessions.getSession(sessionId);
    if (session.userId !== userId || session.status !== "active" || session.expireAt <= Date.now()) throw new IdentityError("SESSION_UNAVAILABLE");
    profile = await currentUser();
  } catch (error) {
    if (error instanceof IdentityError) throw error;
    if (error && typeof error === "object" && "status" in error && error.status === 404) throw new IdentityError("ACCOUNT_UNAVAILABLE");
    // Includes rate limits/network failures. Never return a cached local user
    // or log provider bodies, email addresses, tokens, or session identifiers.
    throw new IdentityError("PROVIDER_UNAVAILABLE");
  }
  if (!profile || profile.id !== userId || profile.banned || profile.locked) throw new IdentityError("ACCOUNT_UNAVAILABLE");
  if (!allowUnverifiedEmail && (!profile.primaryEmailAddress || profile.primaryEmailAddress.verification?.status !== "verified")) throw new IdentityError("VERIFICATION_REQUIRED");
  return profile;
}
