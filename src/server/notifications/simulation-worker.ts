import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { lifecycleNow } from "../lifecycle/clock";
import { requireSimulation, lookupKeys } from "./simulation-config";
import { FakeResendProvider, type ProviderResult } from "./fake-provider";
import { assertSimulationAdmission } from "./restore-simulation";
import { renderEnvelope, encryptEnvelope, decryptEnvelope, SIM_TEMPLATE, simTemplateDigest } from "./envelope";
import { simulationRecipient, simulationRelevance, simulationControls } from "./simulation-policy";
import type { NotificationKind } from "./registry";
import { reconcileNotificationSources } from "./discovery";
import { processNotificationSource } from "./worker";
export async function dispatchSimulation(id:string,provider:FakeResendProvider,runId?:string){
 requireSimulation();if(!(provider instanceof FakeResendProvider))throw new Error("Only local fake transport allowed");await assertSimulationAdmission(provider);
 const token=randomUUID();
 const claimed=await prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "NotificationOutbox" WHERE id=${id} AND "captureAttempts"=0 AND ("processingState" IN ('PENDING','RETRY_PENDING') OR ("processingState"='CLAIMED' AND "leaseUntil" <= (clock_timestamp() AT TIME ZONE 'UTC'))) AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= (clock_timestamp() AT TIME ZONE 'UTC')) AND "scheduledAt" <= (clock_timestamp() AT TIME ZONE 'UTC') FOR UPDATE SKIP LOCKED`;
  if(!rows.length)return null;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(o.engineeringTransport!==null)return null; // HTTP engineering evidence never enters the synthetic dispatch path.
  if(o.simulated){
   const unfinished=await tx.notificationDeliveryAttempt.findFirst({where:{notificationId:id,mode:"SIMULATED",completedAt:null}});
   if(unfinished){await tx.notificationDeliveryAttempt.update({where:{id:unfinished.id},data:{result:"UNKNOWN",completedAt:now,responseCategory:"EXPIRED_DISPATCH_INTENT"}});await tx.notificationOutbox.update({where:{id},data:{deliveryOutcome:"UNKNOWN",processingState:"MANUAL_REVIEW",lastFailureCode:"RECONCILE_UNKNOWN",leaseToken:null,leaseUntil:null}});return null;}
  }
  if(o.kind==="EXPORT_AVAILABLE"){
   await tx.notificationOutbox.update({where:{id},data:{processingState:"MANUAL_REVIEW",lastFailureCode:"EXPORT_READY_REQUIRES_NX",leaseToken:null,leaseUntil:null}});return null;
  }
  if(!await simulationControls(tx,o.kind))return null;
  if(o.deliveryOutcome==="UNKNOWN"&&o.lastFailureCode!=="UNKNOWN_LOOKUP_SAFE_WINDOW")return null; // Reconciliation is separate, never a blind retry.
  await tx.notificationOutbox.update({where:{id},data:{processingState:"CLAIMED",leaseToken:token,leaseUntil:new Date(+now+90000),version:{increment:1}}});return o;
 });
 if(!claimed)return {state:"SKIPPED"};
 let proof:Awaited<ReturnType<typeof simulationRecipient>>=null,identityUnavailable=false;
 try{proof=await simulationRecipient(claimed.recipientUserId);}catch{identityUnavailable=true;}
 const prepared=await prisma.$transaction(async tx=>{
  const source=await tx.notificationSource.findUniqueOrThrow({where:{id:claimed.sourceId}});await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${source.workspaceId} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(o.leaseToken!==token||!o.leaseUntil||o.leaseUntil<=now)return null;
  const release=async(code:string,retry=false)=>{await tx.notificationOutbox.update({where:{id},data:{processingState:retry?"RETRY_PENDING":code==="SUPPRESSED"?"SUPPRESSED":"MANUAL_REVIEW",lastFailureCode:code,nextAttemptAt:retry?new Date(+now+60000):null,leaseToken:null,leaseUntil:null}});return null;};
  if(identityUnavailable)return release("IDENTITY_TEMPORARILY_UNAVAILABLE",true);
  const invalid=await simulationRelevance(tx,o,now,proof);if(invalid)return release(invalid,invalid==="SIMULATION_PAUSED");
  if(o.simulated&&o.providerScope!==requireSimulation().scope)return release("PROVIDER_SCOPE_REVIEW");
  if(await tx.notificationDeliveryAttempt.count({where:{notificationId:id,mode:"PROVIDER"}}))return release("RESTORED_PROVIDER_REVIEW");
  const unfinished=await tx.notificationDeliveryAttempt.findFirst({where:{notificationId:id,mode:"SIMULATED",completedAt:null}});
  if(unfinished){await tx.notificationDeliveryAttempt.update({where:{id:unfinished.id},data:{result:"UNKNOWN",completedAt:now,responseCategory:"LEASE_EXPIRED_UNKNOWN"}});await tx.notificationOutbox.update({where:{id},data:{deliveryOutcome:"UNKNOWN",processingState:"MANUAL_REVIEW",lastFailureCode:"RECONCILE_UNKNOWN",leaseToken:null,leaseUntil:null}});return null;}
  if(o.safeRetryUntil&&now>=o.safeRetryUntil)return release("SAFE_RETRY_WINDOW_EXPIRED");
  if(o.dispatchedAttempts>=8)return release("ATTEMPT_REVIEW_REQUIRED");
  let existingEnvelope;
  if(o.payloadHash){if(o.payloadKeyVersion!==requireSimulation().keyVersion||!o.frozenPayloadCipher)return release("PAYLOAD_KEY_REVIEW");try{existingEnvelope=decryptEnvelope(o.frozenPayloadCipher,id,o.payloadHash);}catch{return release("PAYLOAD_INTEGRITY_REVIEW");}}
  await tx.$queryRaw`SELECT key FROM "NotificationControl" WHERE key='GLOBAL' FOR UPDATE`;
  const global=await tx.notificationControl.findUniqueOrThrow({where:{key:"GLOBAL"}});
  if(global.nextPermitAt&&global.nextPermitAt>now){await tx.notificationOutbox.update({where:{id},data:{processingState:"RETRY_PENDING",nextAttemptAt:global.nextPermitAt,lastFailureCode:"SHARED_RATE_BUDGET",leaseToken:null,leaseUntil:null}});return null;}
  const preferUrgent=global.simulationLaneCursor%4!==3;
  if((o.priority<=1)!==preferUrgent){
   const otherRows=await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT o.id FROM "NotificationOutbox" o JOIN "NotificationControl" k ON k.key='kind:'||o.kind WHERE o.id<>${id} AND o."captureAttempts"=0 AND (o.priority<=1)=${preferUrgent} AND o."processingState" IN ('PENDING','RETRY_PENDING','CLAIMED') AND o."scheduledAt"<=${now} AND (o."nextAttemptAt" IS NULL OR o."nextAttemptAt"<=${now}) AND (o."latestSendAt" IS NULL OR o."latestSendAt">${now}) AND k."captureEnabled" AND k."simulationEnabled" AND NOT k.enabled AND (k."pauseUntil" IS NULL OR k."pauseUntil"<=${now}) AND o.kind<>'EXPORT_AVAILABLE' AND (NOT o.simulated OR o."providerScope"=${requireSimulation().scope}) LIMIT 1`);
   const other=otherRows[0];
   if(other){await tx.notificationOutbox.update({where:{id},data:{processingState:"RETRY_PENDING",nextAttemptAt:new Date(+now+1000),lastFailureCode:"SHARED_LANE_WAIT",leaseToken:null,leaseUntil:null}});return null;}
  }
  const slots=await tx.$queryRaw<{slot:number}[]>`SELECT slot FROM "NotificationProviderPermit" WHERE "leaseUntil" IS NULL OR "leaseUntil" <= (clock_timestamp() AT TIME ZONE 'UTC') ORDER BY slot FOR UPDATE SKIP LOCKED LIMIT 1`;
  if(!slots.length)return release("IN_FLIGHT_BUDGET",true);
  await tx.notificationProviderPermit.update({where:{slot:slots[0].slot},data:{token,notificationId:id,leaseUntil:new Date(+now+90000)}});
  await tx.notificationControl.update({where:{key:"GLOBAL"},data:{nextPermitAt:new Date(+now+1000),simulationLaneCursor:{increment:1}}});
  let envelope,hash=o.payloadHash;
  if(hash){envelope=existingEnvelope!;}
  else{
   envelope=renderEnvelope(o.kind as NotificationKind,proof!.email,id,o.providerKey);const frozen=encryptEnvelope(envelope);hash=frozen.hash;
   await tx.notificationOutbox.update({where:{id},data:{simulated:true,providerScope:envelope.providerScope,templateVersion:SIM_TEMPLATE,templateDigest:simTemplateDigest(o.kind as NotificationKind),frozenPayloadCipher:frozen.cipher,payloadHash:hash,payloadKeyVersion:requireSimulation().keyVersion,identityKeyVersion:lookupKeys()[0].version,identityBindingDigest:proof!.binding,destinationDigest:proof!.destination,recipientVerifiedAt:now,firstDispatchedAt:now,safeRetryUntil:new Date(+now+23*3600000)}});
  }
  const a=await tx.notificationDeliveryAttempt.create({data:{notificationId:id,providerScope:envelope.providerScope,providerKey:o.providerKey,payloadHash:hash,attemptNo:o.dispatchedAttempts+1,leaseToken:token,mode:"SIMULATED",result:"DISPATCH_INTENT",dispatchedAt:now,startedAt:now,runId}});
  await tx.notificationOutbox.update({where:{id},data:{dispatchedAttempts:{increment:1}}});return {a,envelope,now,slot:slots[0].slot,frozenIdentity:{destinationDigest:o.destinationDigest??proof!.destination,keyVersion:o.identityKeyVersion??lookupKeys()[0].version}};
 },{timeout:10000});
 if(!prepared)return {state:"DEFERRED"};
 // Intent committed. No SQL transaction is open across fake provider I/O.
 let result:ProviderResult;
 try{await assertSimulationAdmission(provider);result=await provider.send(prepared.envelope,prepared.now,prepared.frozenIdentity);}catch{result={type:"UNKNOWN"};}
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;
  const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),a=await tx.notificationDeliveryAttempt.findUniqueOrThrow({where:{id:prepared.a.id}}),now=await lifecycleNow(tx);
  if(!a.completedAt)await tx.notificationDeliveryAttempt.update({where:{id:a.id},data:{result:result.type==="ACCEPTED"?"ACCEPTED":result.type==="REJECTED"?"KNOWN_REJECTED":result.type==="RATE_LIMITED"?"RATE_LIMITED":"UNKNOWN",providerMessageId:result.type==="ACCEPTED"?result.messageId:null,completedAt:now,responseCategory:`SIMULATED_${result.type}`,retryEligible:result.type==="RATE_LIMITED"}});
  if(o.leaseToken===token&&o.leaseUntil&&o.leaseUntil>now){
   const accepted=result.type==="ACCEPTED",unknown=result.type==="UNKNOWN",retry=result.type==="RATE_LIMITED";
   await tx.notificationOutbox.update({where:{id},data:{processingState:retry?"RETRY_PENDING":unknown?"MANUAL_REVIEW":"SETTLED",deliveryOutcome:accepted?"PROVIDER_ACCEPTED":unknown?"UNKNOWN":retry?o.deliveryOutcome:"FAILED",providerMessageId:result.type==="ACCEPTED"?result.messageId:o.providerMessageId,acceptedAt:accepted?o.acceptedAt??now:o.acceptedAt,completedAt:retry?null:now,nextAttemptAt:retry?new Date(+now+Math.min(3600000,Math.max(60000,result.type==="RATE_LIMITED"?result.retryAfterMs:60000))):null,lastFailureCode:accepted?null:`SIMULATED_${result.type}`,leaseToken:null,leaseUntil:null}});
  }
  await tx.notificationProviderPermit.updateMany({where:{slot:prepared.slot,token},data:{token:null,notificationId:null,leaseUntil:null}});
 });
 return {state:result.type};
}
export async function reconcileSimulationUnknown(id:string,provider:FakeResendProvider){
 requireSimulation();await assertSimulationAdmission(provider);const o=await prisma.notificationOutbox.findUniqueOrThrow({where:{id}});
 if(!o.simulated||o.providerScope!==requireSimulation().scope)return;
 const known=await provider.lookup(o.providerKey);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;
  const current=await tx.notificationOutbox.findUniqueOrThrow({where:{id}}),now=await lifecycleNow(tx);
  if(current.deliveryOutcome!=="UNKNOWN")return;
  const unfinished=await tx.notificationDeliveryAttempt.findMany({where:{notificationId:id,mode:"SIMULATED",completedAt:null}});
  if(current.leaseUntil&&current.leaseUntil>now)return;
  for(const a of unfinished)await tx.notificationDeliveryAttempt.update({where:{id:a.id},data:{result:"UNKNOWN",completedAt:now,responseCategory:"RECOVERED_UNKNOWN"}});
  if(known?.accepted){if(known.hash!==current.payloadHash||known.destination!==current.destinationDigest)throw new Error("Provider reconciliation mismatch");await tx.notificationOutbox.update({where:{id},data:{processingState:"SETTLED",deliveryOutcome:"PROVIDER_ACCEPTED",providerMessageId:known.messageId,acceptedAt:current.acceptedAt??now,completedAt:now,leaseToken:null,leaseUntil:null,lastFailureCode:null}});return;}
  if(!current.safeRetryUntil||now>=current.safeRetryUntil){await tx.notificationOutbox.update({where:{id},data:{processingState:"MANUAL_REVIEW",lastFailureCode:"SAFE_RETRY_WINDOW_EXPIRED",leaseToken:null,leaseUntil:null}});return;}
  // Authoritative fake lookup found no accepted request. Keep UNKNOWN evidence
  // until a new same-key attempt obtains a known outcome; no force-send control.
  await tx.notificationOutbox.update({where:{id},data:{processingState:"RETRY_PENDING",nextAttemptAt:new Date(+now+60000),lastFailureCode:"UNKNOWN_LOOKUP_SAFE_WINDOW",leaseToken:null,leaseUntil:null}});
 });
}
export async function runSimulation(provider:FakeResendProvider,limit=20){
 requireSimulation();if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error("Invalid simulation bounds");await assertSimulationAdmission(provider);
 const started=Date.now(),run=await prisma.notificationRun.create({data:{dryRun:false,simulated:true,leaseToken:randomUUID()}});let processed=0,failed=0,skipped=0;
 await reconcileNotificationSources(limit);
 const sources=await prisma.notificationSource.findMany({where:{state:{notIn:["HISTORICAL_REVIEW","AUDIT_ONLY"]},OR:[{nextReconcileAt:null},{nextReconcileAt:{lte:new Date()}}]},take:limit,orderBy:{id:"asc"},select:{id:true}});
 for(const s of sources){if(Date.now()-started>16000)break;try{await processNotificationSource(s.id,started+18000);}catch{failed++;}}
 const unknown=await prisma.notificationOutbox.findMany({where:{simulated:true,providerScope:requireSimulation().scope,deliveryOutcome:"UNKNOWN"},take:limit,orderBy:{id:"asc"},select:{id:true}});
 for(const o of unknown){if(Date.now()-started>16000)break;try{await reconcileSimulationUnknown(o.id,provider);}catch{failed++;}}
 const selectLane=(urgent:boolean)=>prisma.$queryRaw<{id:string;priority:number}[]>(Prisma.sql`SELECT o.id,o.priority FROM "NotificationOutbox" o JOIN "NotificationControl" k ON k.key='kind:'||o.kind WHERE (o.priority<=1)=${urgent} AND o."captureAttempts"=0 AND (o."processingState" IN ('PENDING','RETRY_PENDING') OR (o."processingState"='CLAIMED' AND o."leaseUntil"<=(clock_timestamp() AT TIME ZONE 'UTC'))) AND o."scheduledAt"<=(clock_timestamp() AT TIME ZONE 'UTC') AND (o."nextAttemptAt" IS NULL OR o."nextAttemptAt"<=(clock_timestamp() AT TIME ZONE 'UTC')) AND (o."latestSendAt" IS NULL OR o."latestSendAt">(clock_timestamp() AT TIME ZONE 'UTC')) AND k."captureEnabled" AND k."simulationEnabled" AND NOT k.enabled AND (k."pauseUntil" IS NULL OR k."pauseUntil"<=(clock_timestamp() AT TIME ZONE 'UTC')) AND o.kind<>'EXPORT_AVAILABLE' AND (NOT o.simulated OR o."providerScope"=${requireSimulation().scope}) ORDER BY o."scheduledAt",o.id LIMIT ${limit}`);
 const [urgent,standard]=await Promise.all([selectLane(true),selectLane(false)]),selected:{id:string;priority:number}[]=[];
 let lane=(await prisma.notificationControl.findUnique({where:{key:"GLOBAL"},select:{simulationLaneCursor:true}}))?.simulationLaneCursor??0;
 while(selected.length<limit&&(urgent.length||standard.length)){const queue=lane%4===3?standard:urgent;selected.push((queue.length?queue:queue===urgent?standard:urgent).shift()!);lane++;}
 for(let i=0;i<selected.length&&Date.now()-started<18000;i+=2)await Promise.all(selected.slice(i,i+2).map(async r=>{try{const outcome=await dispatchSimulation(r.id,provider,run.id);if(outcome.state==="SKIPPED"||outcome.state==="DEFERRED")skipped++;else processed++;}catch{failed++;}}));
 await prisma.notificationRun.update({where:{id:run.id},data:{completedAt:new Date(),eligibleCount:selected.length,processedCount:processed,skippedCount:skipped,failedCount:failed,summary:{durationMs:Date.now()-started,urgent:selected.filter(r=>r.priority<=1).length,standard:selected.filter(r=>r.priority>1).length},failureCode:failed?"SIMULATION_WORKER_FAILED":null}});return {runId:run.id,processed,skipped,failed};
}
