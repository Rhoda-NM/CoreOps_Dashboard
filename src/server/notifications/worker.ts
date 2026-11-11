import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { lifecycleNow } from "../lifecycle/clock";
import { type Prisma } from "@prisma/client";
import { NOTIFICATION_POLICY, requireNotificationRehearsal } from "./config";
import { templateDigest, type NotificationKind } from "./registry";
import { audienceUsers, evaluateSource, recipientStillMatches, verifyRecipient } from "./recipients";
import { captureEnvelope } from "./capture-sink";
import { reconcileNotificationSources } from "./discovery";
const leaseMs=90000;
async function enabled(tx:Prisma.TransactionClient,kind?:string){
 const keys=kind?["GLOBAL",`kind:${kind}`]:["GLOBAL"];
 const rows=await tx.notificationControl.findMany({where:{key:{in:keys}}});const now=await lifecycleNow(tx);
 return rows.length===keys.length&&rows.every(r=>r.captureEnabled&&!r.enabled&&(!r.pauseUntil||r.pauseUntil<=now));
}
async function workspaceLock(tx:Prisma.TransactionClient,id:string){await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${id} FOR UPDATE`;}
export async function processNotificationSource(id:string,deadline=Date.now()+18000){
 requireNotificationRehearsal(); const token=randomUUID();
 const claim=await prisma.$transaction(async tx=>{
  if(!await enabled(tx))return null;
  const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "NotificationSource" WHERE id=${id} AND ("leaseUntil" IS NULL OR "leaseUntil" <= (clock_timestamp() AT TIME ZONE 'UTC')) FOR UPDATE SKIP LOCKED`;
  if(!rows.length)return null;
  const s=await tx.notificationSource.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(["AUDIT_ONLY","HISTORICAL_REVIEW"].includes(s.state))return null;
  const evaluation=await evaluateSource(s,tx,now); const candidates:{kind:NotificationKind;userId:string}[]=[];
  for(const intent of evaluation.intents){if(!await enabled(tx,intent.kind))continue;const ids=await audienceUsers(s,intent,tx);if(ids.length>50)throw new Error("Audience requires review");for(const userId of ids)candidates.push({kind:intent.kind,userId});}
  if(candidates.length>50)throw new Error("Audience requires review");
  await tx.notificationSource.update({where:{id},data:{leaseToken:token,leaseUntil:new Date(+now+leaseMs)}});
  return {s,candidates};
 });
 if(!claim)return {skipped:true};
 const proofs=new Map<string,Awaited<ReturnType<typeof verifyRecipient>>>();let identityUnavailable=false;
 for(const c of claim.candidates){if(Date.now()>=deadline-4000){identityUnavailable=true;break;}if(proofs.has(c.userId))continue;try{proofs.set(c.userId,await verifyRecipient(c.userId));}catch{identityUnavailable=true;}}
 return prisma.$transaction(async tx=>{
  await workspaceLock(tx,claim.s.workspaceId!);
  await tx.$queryRaw`SELECT id FROM "NotificationSource" WHERE id=${id} FOR UPDATE`;
  const s=await tx.notificationSource.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(s.leaseToken!==token||!s.leaseUntil||s.leaseUntil<=now)return {skipped:true};
  const ev=await evaluateSource(s,tx,now);let created=0;
  for(const intent of ev.intents){
   if(!await enabled(tx,intent.kind))continue;
   const ids=await audienceUsers(s,intent,tx);if(ids.length>50)throw new Error("Audience requires review");
   for(const userId of ids){const proof=proofs.get(userId);if(!proof||!await recipientStillMatches(tx,userId,proof.binding))continue;
    const logicalKey=`${s.canonicalKey}:${intent.kind}:${userId}:EMAIL`;
    const notice=await tx.lifecycleNotice.findUnique({where:{sourceId:s.id},select:{id:true}});
    const rowId=randomUUID();
    await tx.notificationOutbox.upsert({where:{logicalKey_generation:{logicalKey,generation:1}},create:{id:rowId,sourceId:s.id,noticeId:notice?.id,recipientUserId:userId,kind:intent.kind,templateVersion:"CAPTURE-GENERIC-v1",templateDigest:templateDigest(intent.kind),recipientPolicyVersion:NOTIFICATION_POLICY,logicalKey,scheduledAt:s.scheduledAt??now,latestSendAt:s.latestSendAt,priority:notice?1:5,providerScope:requireNotificationRehearsal().providerScope,providerKey:`nb:${rowId}`},update:{}});created++;
   }
  }
  if(!ev.intents.length&&!ev.waiting)await tx.notificationOutbox.updateMany({where:{sourceId:id,processingState:{in:["PENDING","RETRY_PENDING"]}},data:{processingState:"CANCELED",lastFailureCode:ev.code??"SOURCE_STALE",completedAt:now}});
  const waiting=!!ev.intents.length&&!created;
  await tx.notificationSource.update({where:{id},data:{state:ev.code==="WAITING_FOR_TRANSITION"?"WAITING_FOR_TRANSITION":waiting?"WAITING_FOR_RECIPIENT":"RESOLVED",dispositionCode:identityUnavailable?"IDENTITY_TEMPORARILY_UNAVAILABLE":ev.code??(waiting?"NO_CURRENT_RECIPIENT_OR_KIND_DISABLED":"INTENTS_RECONCILED"),nextReconcileAt:new Date(+now+60000),leaseToken:null,leaseUntil:null}});
  return {intents:created,waiting};
 });
}

export async function captureNotification(id:string,runId?:string){
 requireNotificationRehearsal();const token=randomUUID();
 const claim=await prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "NotificationOutbox" WHERE id=${id} AND ("processingState" IN ('PENDING','RETRY_PENDING') OR ("processingState"='CLAIMED' AND "leaseUntil" <= (clock_timestamp() AT TIME ZONE 'UTC'))) AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= (clock_timestamp() AT TIME ZONE 'UTC')) FOR UPDATE SKIP LOCKED`;
  if(!rows.length)return null;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(!await enabled(tx,o.kind)||o.scheduledAt>now)return null;
  await tx.notificationOutbox.update({where:{id},data:{processingState:"CLAIMED",leaseToken:token,leaseUntil:new Date(+now+leaseMs),version:{increment:1}}});
  return o;
 });
 if(!claim)return {skipped:true};
 let proof:Awaited<ReturnType<typeof verifyRecipient>>=null,unavailable=false;
 try{proof=await verifyRecipient(claim.recipientUserId);}catch{unavailable=true;}
 const prepared=await prisma.$transaction(async tx=>{
  const source=await tx.notificationSource.findUniqueOrThrow({where:{id:claim.sourceId}});
  await workspaceLock(tx,source.workspaceId!);await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(o.leaseToken!==token||!o.leaseUntil||o.leaseUntil<=now)return null;
  const release=async(state:"RETRY_PENDING"|"MANUAL_REVIEW"|"SUPPRESSED"|"CANCELED",code:string)=>{await tx.notificationOutbox.update({where:{id},data:{processingState:state,lastFailureCode:code,leaseToken:null,leaseUntil:null,nextAttemptAt:new Date(+now+60000)}});return null;};
  if(!await enabled(tx,o.kind))return release("RETRY_PENDING","CAPTURE_DISABLED");
  if(unavailable)return release("RETRY_PENDING","IDENTITY_TEMPORARILY_UNAVAILABLE");
  if(!proof||!await recipientStillMatches(tx,o.recipientUserId,proof.binding))return release("MANUAL_REVIEW","IDENTITY_NOT_VERIFIED");
  const ev=await evaluateSource(source,tx,now);let relevant=false;
  for(const intent of ev.intents)if(intent.kind===o.kind&&(await audienceUsers(source,intent,tx)).includes(o.recipientUserId))relevant=true;
  if(!relevant)return release("CANCELED",ev.code??"RECIPIENT_AUTHORITY_REVOKED");
  const suppressions=await tx.notificationSuppression.findMany({where:{active:true,providerScope:o.providerScope},select:{digestKeyVersion:true,destinationDigest:true},take:1001});
  if(suppressions.length>1000||suppressions.some(s=>s.digestKeyVersion!==requireNotificationRehearsal().keyVersion))return release("MANUAL_REVIEW","SUPPRESSION_KEY_REVIEW_REQUIRED");
  if(suppressions.some(s=>s.destinationDigest===proof.destination))return release("SUPPRESSED","DESTINATION_SUPPRESSED");
  if(o.payloadHash&&(o.destinationDigest!==proof.destination||o.identityBindingDigest!==proof.binding))return release("MANUAL_REVIEW","FROZEN_IDENTITY_CHANGED");
  if(await tx.notificationDeliveryAttempt.count({where:{notificationId:id,mode:{not:"CAPTURE"}}}))return release("MANUAL_REVIEW","PROVIDER_EVIDENCE_REQUIRES_RECONCILIATION");
  if(o.captureAttempts>=8)return release("MANUAL_REVIEW","CAPTURE_RETRY_LIMIT");
  if(o.safeRetryUntil&&o.safeRetryUntil<=now)return release("MANUAL_REVIEW","CAPTURE_RETRY_WINDOW_EXPIRED");
  const hash=o.payloadHash??createHash("sha256").update(JSON.stringify({id:o.id,sourceId:o.sourceId,kind:o.kind,recipientId:o.recipientUserId,template:o.templateDigest,policy:o.recipientPolicyVersion})).digest("hex");
  // A capture contains identifiers only. No address/body/token is persisted or sent.
  if(!o.payloadHash)await tx.notificationOutbox.update({where:{id},data:{payloadHash:hash,destinationDigest:proof.destination,identityBindingDigest:proof.binding,recipientVerifiedAt:now,safeRetryUntil:new Date(+now+23*3600000)}});
  await tx.notificationDeliveryAttempt.updateMany({where:{notificationId:id,result:"CAPTURE_INTENT",completedAt:null},data:{result:"CAPTURE_ABANDONED",completedAt:now,responseCategory:"LEASE_RECLAIMED"}});
  const attempt=await tx.notificationDeliveryAttempt.create({data:{notificationId:id,providerScope:o.providerScope,providerKey:o.providerKey,payloadHash:hash,attemptNo:o.captureAttempts+1,leaseToken:token,mode:"CAPTURE",result:"CAPTURE_INTENT",runId,startedAt:now}});
  await tx.notificationOutbox.update({where:{id},data:{captureAttempts:{increment:1}}});
  return {attemptId:attempt.id,payloadHash:hash,source};
 });
 if(!prepared)return {skipped:true};
 const captured=await captureEnvelope({notificationId:id,payloadHash:prepared.payloadHash});
 return prisma.$transaction(async tx=>{
  await workspaceLock(tx,prepared.source.workspaceId!);await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(o.leaseToken!==token||!o.leaseUntil||o.leaseUntil<=now)return {skipped:true};
  const source=await tx.notificationSource.findUniqueOrThrow({where:{id:o.sourceId}}),ev=await evaluateSource(source,tx,now);let relevant=false;
  for(const intent of ev.intents)if(intent.kind===o.kind&&(await audienceUsers(source,intent,tx)).includes(o.recipientUserId))relevant=true;
  if(!await enabled(tx,o.kind)||!proof||!await recipientStillMatches(tx,o.recipientUserId,proof.binding))relevant=false;
  await tx.notificationDeliveryAttempt.update({where:{id:prepared.attemptId},data:{result:"CAPTURED",captureId:captured.captureId,completedAt:now,responseCategory:"CAPTURE_ONLY_NOT_SENT"}});
  await tx.notificationOutbox.update({where:{id},data:{processingState:relevant?"SETTLED":"CANCELED",captureId:captured.captureId,completedAt:now,leaseToken:null,leaseUntil:null,lastFailureCode:relevant?null:"AUTHORITY_CHANGED_DURING_CAPTURE"}});
  return {captured:true,relevant};
 });
}
export async function runNotificationCapture({dryRun=true,limit=10}:{dryRun?:boolean;limit?:number}={}){
 requireNotificationRehearsal();if(!Number.isInteger(limit)||limit<1||limit>25)throw new Error("Invalid capture bounds");
 const due=await prisma.notificationOutbox.count({where:{processingState:{in:["PENDING","RETRY_PENDING","CLAIMED"]}}});
 if(dryRun)return {dryRun,queued:due};
 const run=await prisma.notificationRun.create({data:{dryRun:false,leaseToken:randomUUID(),eligibleCount:due}});let failed=0,processed=0,retry=0,skipped=0;const started=Date.now();
 try{
  await reconcileNotificationSources(limit);
  const sources=await prisma.notificationSource.findMany({where:{state:{notIn:["AUDIT_ONLY","HISTORICAL_REVIEW"]},OR:[{nextReconcileAt:null},{nextReconcileAt:{lte:new Date()}}]},orderBy:[{nextReconcileAt:"asc"},{id:"asc"}],take:limit,select:{id:true}});
  for(const s of sources){if(Date.now()-started>18000)break;try{await processNotificationSource(s.id,started+18000);}catch{failed++;}}
  const outbox=await prisma.$queryRaw<{id:string}[]>`SELECT id FROM "NotificationOutbox" WHERE ("processingState" IN ('PENDING','RETRY_PENDING') OR ("processingState"='CLAIMED' AND "leaseUntil"<=(clock_timestamp() AT TIME ZONE 'UTC'))) AND "scheduledAt"<=(clock_timestamp() AT TIME ZONE 'UTC') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt"<=(clock_timestamp() AT TIME ZONE 'UTC')) ORDER BY priority,"scheduledAt",id LIMIT ${limit}`;
  for(const o of outbox){if(Date.now()-started>18000)break;try{const r=await captureNotification(o.id,run.id);if("captured"in r)processed++;else{const state=await prisma.notificationOutbox.findUnique({where:{id:o.id},select:{processingState:true}});if(state?.processingState==="RETRY_PENDING")retry++;else skipped++;}}catch{failed++;}}
 }catch{failed++;}
 await prisma.notificationRun.update({where:{id:run.id},data:{completedAt:new Date(),processedCount:processed,retryCount:retry,skippedCount:skipped,failedCount:failed,failureCode:failed?"CAPTURE_PROCESSING_FAILED":null}});
 return {dryRun:false,runId:run.id,processed,retry,skipped,failed};
}
