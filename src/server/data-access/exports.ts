import "server-only";
import { timingSafeEqual, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AccessError } from "../authorization/errors";
import { lifecycleNow } from "../lifecycle/clock";
import { resolveLifecycle } from "../lifecycle/service";
import { sensitiveIdentity, hash, encrypt, decrypt, exportKeyVersion,assertExportKeyAvailable, requireDataAccess } from "./security";
import { recoveryGrant } from "./grants";
import { dataEvent } from "./events";
import { exportContent } from "./export-content";
type TX = Prisma.TransactionClient;
type Actor = Awaited<ReturnType<typeof sensitiveIdentity>>;

async function authorize(tx: TX, workspaceId: string, actor: Actor, recoveryId: string | null, now: Date) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: actor.user.id } });
  if (user.externalId !== actor.externalId || hash(user.email.toLowerCase()) !== actor.emailHash) throw new AccessError("FORBIDDEN");
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  if (workspace.activationStatus !== "ACTIVE") throw new AccessError("FORBIDDEN");
  const life = await resolveLifecycle(workspaceId, tx, now);
  if (!life.period || life.retentionExpired) throw new AccessError("FORBIDDEN");
  const episodeId = life.journal?.episodeId ?? life.period.id;
  if (recoveryId) await recoveryGrant(tx, workspaceId, recoveryId, user.id, episodeId, "export", now);
  else {
    if (life.state === "CANCELED") throw new AccessError("FORBIDDEN");
    const member = await tx.workspaceMember.findFirst({ where: { workspaceId, userId: user.id, role: "OWNER", status: "ACTIVE" } });
    if (!member) throw new AccessError("FORBIDDEN");
  }
  return episodeId;
}

export const EXPORT_AVAILABILITY_MS=24*3600000;
export const DOWNLOAD_AUTHORIZATION_MS=5*60000;
export const EXPORT_STORAGE_LIMITS={artifacts:100,bytes:800*1024*1024,pending:100};
const open=["REQUESTED","PROCESSING","READY"] as const;
async function binding(row:{requesterExternalId:string|null;requesterEmailHash:string|null;availabilityVersion:number},actor:Actor){
 if(row.availabilityVersion!==2||row.requesterExternalId!==actor.externalId||row.requesterEmailHash!==actor.emailHash)throw new AccessError("FORBIDDEN");
}
function artifactDeadline(row:{availabilityVersion:number;expiresAt:Date;artifactExpiresAt:Date|null}){return row.availabilityVersion===2?row.artifactExpiresAt:row.expiresAt;}
async function issueAuthorization(tx:TX,row:Prisma.WorkspaceExportRequestGetPayload<object>,actor:Actor,now:Date){
 await binding(row,actor);await authorize(tx,row.workspaceId,actor,row.recoveryId,now);
 if(row.status!=="READY"||!row.artifactExpiresAt||row.artifactExpiresAt<=now||!row.artifact||row.leaseUntil&&row.leaseUntil>now)throw new AccessError("CONFLICT");
 if(!row.artifactKeyVersion)throw new AccessError("FORBIDDEN");assertExportKeyAvailable(row.artifactKeyVersion);
 if(await tx.exportDownloadAuthorization.count({where:{requesterId:actor.user.id,issuedAt:{gt:new Date(+now-3600000)}}})>=5)throw new AccessError("CONFLICT");
 await tx.exportDownloadAuthorization.updateMany({where:{exportId:row.id,consumedAt:null,revokedAt:null,expiresAt:{lte:now}},data:{revokedAt:now}});
 if(await tx.exportDownloadAuthorization.count({where:{exportId:row.id,consumedAt:null,revokedAt:null}}))throw new AccessError("CONFLICT");
 let expiry=Math.min(+now+DOWNLOAD_AUTHORIZATION_MS,+row.artifactExpiresAt);
 const lifecycle=await resolveLifecycle(row.workspaceId,tx,now),accessDeadline=row.recoveryId?lifecycle.retentionEndsAt:lifecycle.cancellationAt;
 if(accessDeadline)expiry=Math.min(expiry,+accessDeadline);
 if(row.recoveryId){const g=await tx.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:row.recoveryId}});expiry=Math.min(expiry,+g.expiresAt!);}
 const token=randomBytes(32).toString("hex"),auth=await tx.exportDownloadAuthorization.create({data:{exportId:row.id,workspaceId:row.workspaceId,requesterId:actor.user.id,tokenHash:hash(token),issuedAt:now,expiresAt:new Date(expiry)}});
 await tx.auditLog.create({data:{workspaceId:row.workspaceId,actorUserId:actor.user.id,action:"EXPORT_AUTHORIZATION_ISSUED",resourceType:"ExportDownloadAuthorization",resourceId:auth.id,metadata:{exportId:row.id}}});
 return {id:row.id,token,expiresAt:auth.expiresAt.toISOString(),artifactExpiresAt:row.artifactExpiresAt.toISOString()};
}
async function expireWorkspaceArtifacts(tx: TX, workspaceId: string, now: Date) {
 const rows=await tx.workspaceExportRequest.findMany({where:{workspaceId,status:{in:[...open]}},take:50});
 for(const row of rows){
  const deadline=row.status==="READY"?artifactDeadline(row):row.expiresAt;
  const grant=row.recoveryId?await tx.workspaceRecoveryRequest.findUnique({where:{id:row.recoveryId}}):null;
  const invalidGrant=row.recoveryId&&(!grant||grant.status!=="APPROVED"||grant.revokedAt||grant.activatedAt||!grant.allowExport||!grant.expiresAt||grant.expiresAt<=now);
  const owner=row.recoveryId?null:await tx.workspaceMember.findFirst({where:{workspaceId,userId:row.requesterId,role:"OWNER",status:"ACTIVE"}});
  const user=await tx.user.findUnique({where:{id:row.requesterId}}),lost=row.availabilityVersion===2&&(!user||user.externalId!==row.requesterExternalId||hash(user.email.toLowerCase())!==row.requesterEmailHash||!row.recoveryId&&!owner);
  const leaseExpired=row.status==="PROCESSING"&&row.leaseUntil&&row.leaseUntil<=now;
  if((!deadline||deadline>now)&&!leaseExpired&&!invalidGrant&&!lost)continue;
  // A live network lease remains visible to purge even when access/ciphertext is invalidated.
  await tx.workspaceExportRequest.update({where:{id:row.id},data:{status:"EXPIRED",artifact:null,tokenHash:null,...(row.leaseUntil&&row.leaseUntil>now?{}:{leaseUntil:null,downloadLeaseToken:null})}});
  await tx.exportDownloadAuthorization.updateMany({where:{exportId:row.id,revokedAt:null,consumedAt:null},data:{revokedAt:now}});
  await dataEvent(tx,{workspaceId,episodeId:row.sourcePeriodId,exportId:row.id,type:"EXPORT_EXPIRED",effectiveAt:invalidGrant||lost?now:leaseExpired?row.leaseUntil!:deadline??now},now);
 }
}

export async function requestExport(workspaceId: string, idempotencyKey: string, recoveryId: string | null = null) {
  const actor = await sensitiveIdentity(); z.string().min(16).max(100).parse(idempotencyKey);
  z.string().min(1).max(100).parse(workspaceId); if (recoveryId) z.string().min(1).max(100).parse(recoveryId);
  const payloadHash = hash(JSON.stringify({ workspaceId, recoveryId }));
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    const now = await lifecycleNow(tx), episodeId = await authorize(tx, workspaceId, actor, recoveryId, now);
    await expireWorkspaceArtifacts(tx, workspaceId, now);
    const existing = await tx.workspaceExportRequest.findUnique({ where: { requesterId_idempotencyKey: { requesterId: actor.user.id, idempotencyKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new AccessError("CONFLICT"); return { id: existing.id, status: existing.status }; }
    if (await tx.workspaceExportRequest.count({ where: { requesterId: actor.user.id, createdAt: { gt: new Date(+now - 3600000) } } }) >= 5 || await tx.workspaceExportRequest.count({ where: { workspaceId, status: { in: ["REQUESTED", "PROCESSING", "READY"] } } })) throw new AccessError("CONFLICT");
    await tx.$queryRaw`SELECT 1::text AS locked FROM pg_advisory_xact_lock(811090003,3)`;
    if(await tx.workspaceExportRequest.count({where:{status:{in:["REQUESTED","PROCESSING"]}}})>=EXPORT_STORAGE_LIMITS.pending)throw new AccessError("CONFLICT");
    const row = await tx.workspaceExportRequest.create({ data: { createdAt:now,availabilityVersion:2,requesterExternalId:actor.externalId,requesterEmailHash:actor.emailHash,workspaceId, requesterId: actor.user.id, sourcePeriodId: episodeId, recoveryId, idempotencyKey, payloadHash, expiresAt: new Date(+now + 15 * 60000) } });
    await dataEvent(tx, { workspaceId, episodeId, exportId: row.id, type: "EXPORT_REQUESTED" }, now);
    return { id: row.id, status: row.status };
  });
}

export async function prepareExport(id: string) {
  const actor = await sensitiveIdentity();
  const original = await prisma.workspaceExportRequest.findFirst({ where: { id, requesterId: actor.user.id }, select: { workspaceId: true } });
  if (!original) throw new AccessError("FORBIDDEN");
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${original.workspaceId} FOR UPDATE`;
      const now = await lifecycleNow(tx), row = await tx.workspaceExportRequest.findUniqueOrThrow({ where: { id } });
      await authorize(tx, row.workspaceId, actor, row.recoveryId, now);
      await binding(row,actor);
      if(row.status==="READY")return issueAuthorization(tx,row,actor,now);
      if (row.status !== "REQUESTED" || row.expiresAt <= now) throw new AccessError("FORBIDDEN");
      const [slot] = await tx.$queryRaw<{ available: boolean }[]>`SELECT pg_try_advisory_xact_lock(811090003,1) AS available`;
      if (!slot.available) throw new AccessError("CONFLICT"); // Retry the same pending request; do not spend another hourly request.
      const [storage]=await tx.$queryRaw<{count:bigint;bytes:bigint}[]>`SELECT count(*) AS count,coalesce(sum(octet_length(artifact)),0)::bigint AS bytes FROM "WorkspaceExportRequest" WHERE artifact IS NOT NULL`;
      if(Number(storage.count)>=EXPORT_STORAGE_LIMITS.artifacts||Number(storage.bytes)+8388636>EXPORT_STORAGE_LIMITS.bytes)throw new AccessError("CONFLICT");
      await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
      await tx.workspaceExportRequest.update({ where: { id }, data: { status: "PROCESSING", leaseUntil: new Date(Math.min(+now+10000,+row.expiresAt)) } });
      const bytes = await exportContent(tx, row.workspaceId, now), finished = await lifecycleNow(tx);
      if (+finished - +now > 6000 || finished >= row.expiresAt) throw new Error("EXPORT_TIMEOUT");
      await authorize(tx, row.workspaceId, actor, row.recoveryId, finished);
      const availableUntil=new Date(+finished+EXPORT_AVAILABILITY_MS);
      const ready=await tx.workspaceExportRequest.update({ where: { id }, data: { status: "READY", artifact: encrypt(bytes, id), artifactDigest: hash(bytes), tokenHash:null, generatedAt:finished,artifactExpiresAt:availableUntil,artifactKeyVersion:exportKeyVersion(),leaseUntil: null } });
      await dataEvent(tx, { workspaceId: row.workspaceId, episodeId: row.sourcePeriodId, exportId: id, type: "EXPORT_READY" }, finished);
      return issueAuthorization(tx,ready,actor,finished);
    }, { timeout: 8000, maxWait: 1000 });
  } catch (error) {
    // Persist only a sanitized failure after the generating transaction rolls back.
    if (!(error instanceof AccessError)) await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${original.workspaceId} FOR UPDATE`;
      const row = await tx.workspaceExportRequest.findUniqueOrThrow({ where: { id } });
      if (row.status !== "REQUESTED" && row.status !== "PROCESSING") return;
      const code = error instanceof Error && ["EXPORT_TOO_LARGE", "EXPORT_TIMEOUT", "EXPORT_BUSY"].includes(error.message) ? error.message : "EXPORT_FAILED";
      await tx.workspaceExportRequest.update({ where: { id }, data: { status: "FAILED", artifact: null, tokenHash: null, leaseUntil: null, errorCode: code } });
      await dataEvent(tx, { workspaceId: row.workspaceId, episodeId: row.sourcePeriodId, exportId: id, type: "EXPORT_FAILED" }, await lifecycleNow(tx));
    });
    throw error;
  }
}

export async function authorizeExportDownload(id:string){
 const actor=await sensitiveIdentity();const original=await prisma.workspaceExportRequest.findFirst({where:{id,requesterId:actor.user.id},select:{workspaceId:true}});if(!original)throw new AccessError("FORBIDDEN");
 return prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${original.workspaceId} FOR UPDATE`;return issueAuthorization(tx,await tx.workspaceExportRequest.findUniqueOrThrow({where:{id}}),actor,await lifecycleNow(tx));});
}
export async function downloadExport(id:string,token:string){
 const actor=await sensitiveIdentity();const original=await prisma.workspaceExportRequest.findFirst({where:{id,requesterId:actor.user.id},select:{workspaceId:true}});if(!original||!/^[a-f0-9]{64}$/.test(token))throw new AccessError("FORBIDDEN");
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${original.workspaceId} FOR UPDATE`;
  const [slot]=await tx.$queryRaw<{available:boolean}[]>`SELECT pg_try_advisory_xact_lock(811090003,2) AS available`;if(!slot.available)throw new AccessError("CONFLICT");
  const now=await lifecycleNow(tx),row=await tx.workspaceExportRequest.findUniqueOrThrow({where:{id}});
  await binding(row,actor);await authorize(tx,row.workspaceId,actor,row.recoveryId,now);
  if(await tx.workspaceExportRequest.count({where:{leaseUntil:{gt:now},downloadLeaseToken:{not:null}}})>=4||row.leaseUntil&&row.leaseUntil>now)throw new AccessError("CONFLICT");
  const auth=await tx.exportDownloadAuthorization.findUnique({where:{tokenHash:hash(token)}});
  if(row.status!=="READY"||!row.artifactExpiresAt||row.artifactExpiresAt<=now||!row.artifact||!row.artifactKeyVersion||!auth||auth.exportId!==id||auth.workspaceId!==row.workspaceId||auth.requesterId!==actor.user.id||auth.expiresAt<=now||auth.consumedAt||auth.revokedAt)throw new AccessError("FORBIDDEN");
  if(!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(auth.tokenHash)))throw new AccessError("FORBIDDEN");
  const bytes=decrypt(row.artifact,id,row.artifactKeyVersion);if(hash(bytes)!==row.artifactDigest)throw new Error("EXPORT_FAILED");
  const checked=await lifecycleNow(tx);await authorize(tx,row.workspaceId,actor,row.recoveryId,checked);if(auth.expiresAt<=checked||row.artifactExpiresAt<=checked)throw new AccessError("FORBIDDEN");
  await tx.auditLog.create({data:{workspaceId:row.workspaceId,actorUserId:actor.user.id,action:"EXPORT_DOWNLOAD_ATTEMPT_AUTHORIZED",resourceType:"ExportDownloadAuthorization",resourceId:auth.id,metadata:{exportId:id}}});
  const leaseToken=randomUUID();await tx.exportDownloadAuthorization.update({where:{id:auth.id},data:{consumedAt:checked}});
  await tx.workspaceExportRequest.update({where:{id},data:{leaseUntil:new Date(+checked+60000),downloadLeaseToken:leaseToken}});
  await dataEvent(tx,{workspaceId:row.workspaceId,episodeId:row.sourcePeriodId,exportId:id,type:"EXPORT_DOWNLOAD_AUTHORIZED",operationKey:`${auth.id}:EXPORT_DOWNLOAD_AUTHORIZED`},checked);
  return {bytes,workspaceId:row.workspaceId,id,leaseToken};
 });
}
export async function releaseDownload(id:string,workspaceId:string,leaseToken:string){
 await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;await tx.workspaceExportRequest.updateMany({where:{id,workspaceId,downloadLeaseToken:leaseToken},data:{leaseUntil:null,downloadLeaseToken:null}});},{timeout:2500});
}
export async function cancelExport(id:string){
 const actor=await sensitiveIdentity();const initial=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id},select:{workspaceId:true}});
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${initial.workspaceId} FOR UPDATE`;const now=await lifecycleNow(tx);
  await authorize(tx,initial.workspaceId,actor,null,now);const row=await tx.workspaceExportRequest.findUniqueOrThrow({where:{id}});
  if(!open.includes(row.status as typeof open[number]))return;
  if(row.leaseUntil&&row.leaseUntil>now)throw new AccessError("CONFLICT");
  await tx.workspaceExportRequest.update({where:{id},data:{status:"EXPIRED",artifact:null,tokenHash:null,leaseUntil:null,downloadLeaseToken:null,errorCode:"CANCELED_BY_OWNER"}});
  await tx.exportDownloadAuthorization.updateMany({where:{exportId:id,consumedAt:null,revokedAt:null},data:{revokedAt:now}});
  await tx.auditLog.create({data:{workspaceId:row.workspaceId,actorUserId:actor.user.id,action:"EXPORT_CANCELED_BY_OWNER",resourceType:"WorkspaceExportRequest",resourceId:id}});
  await dataEvent(tx,{workspaceId:row.workspaceId,episodeId:row.sourcePeriodId,exportId:id,type:"EXPORT_EXPIRED"},now);
 });
}

// Future Checkpoint D must call this under the same Workspace row lock before
// any purge batch. No destructive operation or purge service is added in C.
export async function hasActiveExport(tx: TX, workspaceId: string, now: Date) {
  return !!await tx.workspaceExportRequest.count({ where: { workspaceId, OR: [{ status:"REQUESTED",expiresAt:{gt:now} },{status:"READY",OR:[{availabilityVersion:1,expiresAt:{gt:now}},{availabilityVersion:2,artifactExpiresAt:{gt:now}}]},{leaseUntil:{gt:now}}] } });
}

export async function cleanupDataAccess(after?:string) {
  if(after)z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).parse(after);
  requireDataAccess();
  const now = await lifecycleNow(prisma);
  const rows=await prisma.workspaceExportRequest.findMany({where:{status:{in:[...open]},...(after?{id:{gt:after}}:{})},orderBy:{id:"asc"},take:50,select:{id:true,workspaceId:true}});
  const grants = await prisma.workspaceRecoveryRequest.findMany({ where: { status: "APPROVED", expiresAt: { lte: now } }, orderBy:{id:"asc"},take: 50, select: { workspaceId: true } });
  const started = Date.now(); let processed = 0;let lastCursor:string|null=null;const failures:{workspaceId:string;code:string}[]=[];
  for (const workspaceId of new Set([...rows, ...grants].map(r => r.workspaceId))) {
    if (Date.now() - started > 18000) break;
    try{await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    const clock = await lifecycleNow(tx);
    await expireWorkspaceArtifacts(tx, workspaceId, clock);
    await tx.workspaceExportRequest.updateMany({where:{workspaceId,leaseUntil:{lte:clock},downloadLeaseToken:{not:null}},data:{leaseUntil:null,downloadLeaseToken:null}});
    const expiredAuth=await tx.exportDownloadAuthorization.findMany({where:{workspaceId,consumedAt:null,revokedAt:null,expiresAt:{lte:clock}},take:50,select:{id:true}});
    await tx.exportDownloadAuthorization.updateMany({where:{id:{in:expiredAuth.map(a=>a.id)}},data:{revokedAt:clock}});
    const expired = await tx.workspaceRecoveryRequest.findMany({ where: { workspaceId, status: "APPROVED", expiresAt: { lte: clock } }, take: 50 });
    for (const grant of expired) {
      await tx.workspaceRecoveryRequest.update({ where: { id: grant.id }, data: { status: "EXPIRED" } });
      await dataEvent(tx, { workspaceId, episodeId: grant.sourcePeriodId, recoveryId: grant.id, type: "RECOVERY_GRANT_EXPIRED", effectiveAt: grant.expiresAt! }, clock);
    }
    }, { timeout: 3000, maxWait: 500 }); processed++;}catch{failures.push({workspaceId,code:"CLEANUP_FAILED"});}
    const visited=rows.filter(r=>r.workspaceId===workspaceId);if(visited.length)lastCursor=visited.at(-1)!.id;
  }
  return { processedWorkspaces: processed,failures,nextCursor:lastCursor&&(rows.length===50||lastCursor!==rows.at(-1)?.id)?lastCursor:null };
}

export async function dataAccessOverview() {
  const actor = await sensitiveIdentity(false);
  const [workspaces, exports, recovery] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { userId: actor.user.id, role: "OWNER", status: "ACTIVE" }, take: 50, select: { workspace: { select: { id: true, name: true } } } }),
    prisma.workspaceExportRequest.findMany({ where: { requesterId: actor.user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, workspaceId: true, status: true, createdAt: true, expiresAt: true,artifactExpiresAt:true,generatedAt:true,availabilityVersion:true, errorCode: true } }),
    prisma.workspaceRecoveryRequest.findMany({ where: { requesterId: actor.user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, workspaceId: true, status: true, expiresAt: true, allowExport: true, allowReactivation: true } })
  ]);
  const ownedIds=workspaces.map(m=>m.workspace.id);
  const openExports=await prisma.workspaceExportRequest.findMany({where:{workspaceId:{in:ownedIds},status:{in:[...open]}},take:50,select:{id:true,workspaceId:true,status:true}});
  return { workspaces, exports, recovery,openExports };
}
