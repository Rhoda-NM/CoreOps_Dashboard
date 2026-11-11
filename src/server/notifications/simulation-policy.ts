import "server-only";
import type { NotificationOutbox, Prisma } from "@prisma/client";
import { verifyRecipient, recipientStillMatches, evaluateSource, audienceUsers } from "./recipients";
import { lookupKeys, fingerprint, requireSimulation } from "./simulation-config";
import { prisma } from "../db/prisma";
export async function simulationRecipient(userId:string){
 requireSimulation();const proof=await verifyRecipient(userId),u=await prisma.user.findUnique({where:{id:userId},select:{email:true}});
 return proof&&u&&u.email.toLowerCase().endsWith(".test")?{...proof,email:u.email.trim().toLowerCase()}:null;
}
export async function simulationControls(tx:Prisma.TransactionClient,kind?:string){
 const keys=kind?["GLOBAL",`kind:${kind}`]:["GLOBAL"],now=(await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`)[0].now;
 const rows=await tx.notificationControl.findMany({where:{key:{in:keys}}});
 return kind!=="EXPORT_AVAILABLE"&&rows.length===keys.length&&rows.every(r=>!r.enabled&&r.captureEnabled&&r.simulationEnabled&&(!r.pauseUntil||r.pauseUntil<=now));
}
export async function suppressionStatus(tx:Prisma.TransactionClient,scope:string,email:string){
 const keys=lookupKeys();
 if(await tx.notificationSuppression.findFirst({where:{providerScope:scope,active:true,digestKeyVersion:{notIn:keys.map(k=>k.version)}},select:{id:true}}))return "SUPPRESSION_KEY_REVIEW";
 return await tx.notificationSuppression.findFirst({where:{providerScope:scope,active:true,channel:"EMAIL",OR:keys.map(k=>({digestKeyVersion:k.version,destinationDigest:fingerprint(k.key,email,"destination")}))},select:{id:true}})?"SUPPRESSED":null;
}
export async function simulationRelevance(tx:Prisma.TransactionClient,o:NotificationOutbox,now:Date,proof:Awaited<ReturnType<typeof simulationRecipient>>){
 if(!await simulationControls(tx,o.kind))return o.kind==="EXPORT_AVAILABLE"?"EXPORT_READY_REQUIRES_NX":"SIMULATION_PAUSED";
 if(!proof||!await recipientStillMatches(tx,o.recipientUserId,proof.binding))return "IDENTITY_REVIEW";
 const s=await tx.notificationSource.findUniqueOrThrow({where:{id:o.sourceId}}),ev=await evaluateSource(s,tx,now);let relevant=false;
 for(const intent of ev.intents)if(intent.kind===o.kind&&(await audienceUsers(s,intent,tx)).includes(o.recipientUserId))relevant=true;
 if(!relevant)return ev.code??"RECIPIENT_REVOKED";
 if(o.payloadHash){
  const key=lookupKeys().find(k=>k.version===o.identityKeyVersion),u=await tx.user.findUnique({where:{id:o.recipientUserId},select:{email:true,externalId:true}});
  if(!key||!u?.externalId||fingerprint(key.key,`${u.externalId}:${u.email.trim().toLowerCase()}`,"identity")!==o.identityBindingDigest||fingerprint(key.key,proof.email,"destination")!==o.destinationDigest)return "FROZEN_IDENTITY_REVIEW";
 }
 return suppressionStatus(tx,requireSimulation().scope,proof.email);
}
