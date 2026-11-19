import "server-only";
import { auth, clerkClient, currentUser, reverificationError } from "@clerk/nextjs/server";
import { prisma } from "../db/prisma";
import { requireCentralHost } from "../routing/request-context";
import { stagingTarget } from "./config";
import { handoffTarget, validateRequest, sealSession, setupAdministrator } from "./setup-handoff";

// This narrowly scoped entry can authorize only an encrypted CLI handoff before
// StagingEnvironment exists. It grants no platform page/data/mutation authority.
// Normal platformEntry and requireClerkIdentity remain unchanged.
export async function initialStagingSetupTarget() {
  await requireCentralHost();
  const target=handoffTarget(stagingTarget());
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (name !== target.databaseName) throw new Error("STAGING_DATABASE_MISMATCH");
  return target;
}
export async function stagingSetupEntry() {
  const denied = (code: "SETUP_SIGN_IN_REQUIRED" | "SETUP_ADMIN_IDENTITY_MISMATCH" | "SETUP_ADMIN_NOT_FOUND" | "SETUP_PROFILE_UNAVAILABLE" | "SETUP_MFA_NOT_ENROLLED" | "SETUP_SESSION_UNAVAILABLE") => {
    if (process.env.VERCEL_ENV === "preview") {
      try { console.info(JSON.stringify({ event: "STAGING_SETUP_AUTHORIZATION", code })); } catch { /* No raw fallback. */ }
    }
    return null;
  };
  const target=await initialStagingSetupTarget();
  const session=await auth();
  if(!session.userId || !session.sessionId) return denied("SETUP_SIGN_IN_REQUIRED");
  if(session.userId!==setupAdministrator) return denied("SETUP_ADMIN_IDENTITY_MISMATCH");
  const admin=await prisma.platformAdmin.findFirst({where:{active:true,role:"SUPER_ADMIN",user:{externalId:session.userId,platformSuspended:false}}});
  if(!admin) return denied("SETUP_ADMIN_NOT_FOUND");
  const client=await clerkClient();
  const [profile,live]=await Promise.all([currentUser(),client.sessions.getSession(session.sessionId)]);
  if(!profile || profile.id!==session.userId || profile.banned || profile.locked || profile.primaryEmailAddress?.verification?.status!=="verified") return denied("SETUP_PROFILE_UNAVAILABLE");
  if(!profile.twoFactorEnabled) return denied("SETUP_MFA_NOT_ENROLLED");
  if(live.id!==session.sessionId || live.userId!==session.userId || live.status!=="active" || live.expireAt<=Date.now()) return denied("SETUP_SESSION_UNAVAILABLE");
  const factors=session.sessionClaims?.fva;
  const mfa=Array.isArray(factors) && factors.length===2 && factors.every(age=>Number.isInteger(age)&&age>=0) && !!session.has({reverification:"strict_mfa"});
  return {session,target,admin,mfa};
}
export async function authorizeSetupRequest(value: unknown) {
  const entry=await stagingSetupEntry();
  if(!entry) return {status:"denied" as const};
  const request=validateRequest(value,entry.target);
  if(!entry.mfa) return reverificationError("strict_mfa");
  // SDK returns the ordinary current session token. It never reaches the client
  // unencrypted, a URL, a log, a database column or a plaintext operator file.
  const token=await entry.session.getToken();
  const claims=entry.session.sessionClaims;
  const now=Date.now(),factors=claims.fva!;
  const expiresAt=Math.min(now+60000,claims.exp*1000,(claims.iat+(10-Math.max(...factors))*60)*1000,request.expiresAt,Date.parse(request.manifest.validUntil));
  if(!token || expiresAt-now<15000) return {status:"refresh" as const};
  // Recheck database authority immediately before releasing the encrypted proof.
  if(!await prisma.platformAdmin.findFirst({where:{id:entry.admin.id,active:true,role:"SUPER_ADMIN",user:{externalId:setupAdministrator,platformSuspended:false}}})) return {status:"denied" as const};
  return {status:"authorized" as const,authorization:sealSession(request,token,expiresAt,now)};
}

// Navigation only. An absent registry never becomes a general authorization
// bypass: only the existing live-verified administrator reaches the setup UI.
export async function initialStagingSetupRequired() {
  const { stagingRequested } = await import("./config");
  if (!stagingRequested()) return false;
  try {
    const entry = await stagingSetupEntry();
    if (!entry) return false;
    const registry = await prisma.stagingEnvironment.findUnique({ where: { id: entry.target.id }, select: { id: true } });
    return !registry;
  } catch { return false; } // Config/provider failures remain closed on normal entry.
}
