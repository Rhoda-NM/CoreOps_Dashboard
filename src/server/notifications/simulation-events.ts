import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { NotificationOutbox, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireSimulation, simulationKey } from "./simulation-config";
import { sha } from "./envelope";
import { FakeResendProvider } from "./fake-provider";
const eventSchema=z.object({id:z.string().min(1).max(200),scope:z.string().max(300),notificationId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),attemptId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),messageId:z.string().regex(/^sim_[a-f0-9]{40}$/),destinationDigest:z.string().regex(/^[a-f0-9]{64}$/),type:z.enum(["accepted","delivered","delayed","bounced","complained"]),occurredAt:z.string().datetime()}).strict();
export type SyntheticEvent=z.infer<typeof eventSchema>;
const signingKeyRef=()=>`SYNTHETIC-HMAC-v1:${sha(simulationKey("COREOPS_NOTIFICATION_SIM_WEBHOOK_KEY")).slice(0,24)}`;
export function signSyntheticEvent(body:Buffer,id:string,timestamp:string){return createHmac("sha256",simulationKey("COREOPS_NOTIFICATION_SIM_WEBHOOK_KEY")).update(`${id}.${timestamp}.`).update(body).digest("hex");}
async function applyEvidence(tx:Prisma.TransactionClient,o:NotificationOutbox,e:SyntheticEvent,now:Date,eventId:string){
 const occurred=new Date(e.occurredAt),rank={NOT_SENT:0,UNKNOWN:0,FAILED:0,PROVIDER_ACCEPTED:1,DELAYED:2,DELIVERED_TO_SERVER:3,BOUNCED:4,COMPLAINED:5};
 const outcome=({accepted:"PROVIDER_ACCEPTED",delayed:"DELAYED",delivered:"DELIVERED_TO_SERVER",bounced:"BOUNCED",complained:"COMPLAINED"} as const)[e.type];
 if(o.providerMessageId&&o.providerMessageId!==e.messageId)throw new Error("Provider message conflict");
 const attempt=e.attemptId?await tx.notificationDeliveryAttempt.findFirst({where:{id:e.attemptId,notificationId:o.id,mode:"SIMULATED",providerScope:e.scope,providerKey:o.providerKey,payloadHash:o.payloadHash!},select:{id:true}}):null;
 if(e.attemptId&&!attempt){await tx.notificationProviderEvent.update({where:{id:eventId},data:{state:"QUARANTINED",failureCode:"ATTEMPT_MAPPING_CONFLICT"}});return {state:"QUARANTINED"};}
 await tx.notificationOutbox.update({where:{id:o.id},data:{providerMessageId:e.messageId,deliveryOutcome:rank[outcome]>rank[o.deliveryOutcome]?outcome:o.deliveryOutcome,acceptedAt:o.acceptedAt??occurred,...(e.type==="delivered"?{deliveredAt:o.deliveredAt??occurred}:{}),...(e.type==="bounced"?{bouncedAt:o.bouncedAt??occurred}:{}),...(e.type==="complained"?{complainedAt:o.complainedAt??occurred}:{}),processingState:"SETTLED",completedAt:now,leaseToken:null,leaseUntil:null}});
 const stored=await tx.notificationProviderEvent.update({where:{id:eventId},data:{notificationId:o.id,attemptId:attempt?.id,state:"APPLIED",processedAt:now,failureCode:null}});
 if(e.type==="bounced"||e.type==="complained")await tx.notificationSuppression.upsert({where:{providerScope_channel_digestKeyVersion_destinationDigest:{providerScope:e.scope,channel:"EMAIL",digestKeyVersion:o.identityKeyVersion!,destinationDigest:o.destinationDigest!}},create:{providerScope:e.scope,channel:"EMAIL",digestKeyVersion:o.identityKeyVersion!,destinationDigest:o.destinationDigest!,providerEventId:stored.id,reasonCode:`SIMULATED_${e.type.toUpperCase()}`},update:{active:true,releasedAt:null,releaseReason:null}});
 return {state:"APPLIED"};
}
export async function ingestSimulationEvent(body:Buffer,headers:Headers,provider:FakeResendProvider,now=new Date()){
 const config=requireSimulation();if(!(provider instanceof FakeResendProvider)||body.length>16384)throw new Error("Invalid simulated callback");
 const id=headers.get("x-simulation-id")??"",stamp=headers.get("x-simulation-timestamp")??"",signature=headers.get("x-simulation-signature")??"";
 if(!/^[a-zA-Z0-9_-]{1,200}$/.test(id)||!/^\d{10}$/.test(stamp)||Math.abs(+now-Number(stamp)*1000)>300000||!/^[a-f0-9]{64}$/.test(signature))throw new Error("Invalid simulated signature");
 if(!timingSafeEqual(Buffer.from(signSyntheticEvent(body,id,stamp),"hex"),Buffer.from(signature,"hex")))throw new Error("Invalid simulated signature");
 const consistent=await provider.rememberEvent(id,sha(body));
 let parsed:unknown;try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(body));}catch{parsed=null;}
 const result=eventSchema.safeParse(parsed),e=result.success?result.data:null;
 const validIdentity=e&&e.id===id&&e.scope===config.scope&&+new Date(e.occurredAt)<=+now+60000;
 const candidate=validIdentity?await prisma.notificationOutbox.findUnique({where:{id:e.notificationId},select:{providerKey:true}}):null;
 const known=candidate?await provider.lookup(candidate.providerKey):null;
 const outcome=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`${config.scope}:${id}`},0))`;
  const existing=await tx.notificationProviderEvent.findUnique({where:{providerScope_providerEventId:{providerScope:config.scope,providerEventId:id}}});
  if(existing){if(existing.bodyDigest!==sha(body)||!consistent){await tx.notificationProviderEvent.update({where:{id:existing.id},data:{state:"QUARANTINED",failureCode:"AUTHENTICATED_EVENT_CONFLICT"}});return {state:"CONFLICT"};}return {state:existing.state};}
  const stored=await tx.notificationProviderEvent.create({data:{simulated:true,providerScope:config.scope,providerEventId:id,providerMessageId:validIdentity?e.messageId:null,candidateNotificationId:validIdentity?e.notificationId:null,candidateAttemptId:validIdentity?e.attemptId:null,eventType:validIdentity?e.type:"INVALID_SYNTHETIC_EVENT",occurredAt:validIdentity?new Date(e.occurredAt):null,verifiedAt:now,verificationKeyRef:signingKeyRef(),bodyDigest:sha(body),destinationDigest:validIdentity?e.destinationDigest:null,state:validIdentity&&consistent?"VERIFIED_PENDING":"QUARANTINED",failureCode:validIdentity&&consistent?null:"INVALID_OR_CONFLICTING_SYNTHETIC_EVENT"}});
  if(!validIdentity||!consistent)return {state:"QUARANTINED"};
  await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${e.notificationId} FOR UPDATE`;
  const o=await tx.notificationOutbox.findUnique({where:{id:e.notificationId}});
  if(!o?.simulated||o.providerScope!==config.scope||o.destinationDigest!==e.destinationDigest||!o.firstDispatchedAt||+new Date(e.occurredAt)<+o.firstDispatchedAt||(known?.accepted&&(known.messageId!==e.messageId||known.hash!==o.payloadHash||known.destination!==o.destinationDigest))){await tx.notificationProviderEvent.update({where:{id:stored.id},data:{state:"QUARANTINED",failureCode:"UNMATCHED_OR_CONTRADICTORY_EVENT"}});return {state:"QUARANTINED"};}
  if(!known?.accepted)return {state:"VERIFIED_PENDING"};
  return applyEvidence(tx,o,e,now,stored.id);
 });
 await provider.acknowledgeEvent(id,sha(body));return outcome;
}
export async function reconcileSimulationEvents(provider:FakeResendProvider,limit=20){
 const c=requireSimulation();if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error("Invalid event bound");
 const rows=await prisma.notificationProviderEvent.findMany({where:{simulated:true,providerScope:c.scope,state:"VERIFIED_PENDING"},orderBy:{receivedAt:"asc"},take:limit});let applied=0;
 for(const r of rows){
  if(!r.candidateNotificationId||!r.providerMessageId||!r.destinationDigest||!r.occurredAt)continue;
  const o=await prisma.notificationOutbox.findUnique({where:{id:r.candidateNotificationId}}),known=o?await provider.lookup(o.providerKey):null;if(!o||!known?.accepted)continue;
  const e=eventSchema.parse({id:r.providerEventId,scope:c.scope,notificationId:o.id,attemptId:r.candidateAttemptId??undefined,messageId:r.providerMessageId,destinationDigest:r.destinationDigest,type:r.eventType,occurredAt:r.occurredAt.toISOString()});
  await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "NotificationProviderEvent" WHERE id=${r.id} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${o.id} FOR UPDATE`;
   const latest=await tx.notificationProviderEvent.findUniqueOrThrow({where:{id:r.id}}),current=await tx.notificationOutbox.findUniqueOrThrow({where:{id:o.id}});if(latest.state!=="VERIFIED_PENDING")return;
   if(current.providerScope!==c.scope||!current.simulated||known.messageId!==e.messageId||known.hash!==current.payloadHash||known.destination!==current.destinationDigest||e.destinationDigest!==current.destinationDigest){await tx.notificationProviderEvent.update({where:{id:r.id},data:{state:"QUARANTINED",failureCode:"PENDING_EVENT_MAPPING_CONFLICT"}});return;}
   if((await applyEvidence(tx,current,e,new Date(),r.id)).state==="APPLIED")applied++;
  });
 }
 return {applied};
}
