import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { lifecycleNow } from "../lifecycle/clock";
import { FakeResendProvider } from "./fake-provider";
import { dispatchSimulation } from "./simulation-worker";
import { requireSimulation } from "./simulation-config";
// Proposed wake-driven coordinator; no deployed timer/Cron and no sleep inside ticks.
export async function notificationTick(provider:FakeResendProvider){
 const c=requireSimulation(),token=randomUUID();
 const plan=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT key FROM "NotificationControl" WHERE key='GLOBAL' FOR UPDATE`;
  const control=await tx.notificationControl.findUnique({where:{key:"GLOBAL"}}),now=await lifecycleNow(tx);
  if(!control?.simulationEnabled||!control.captureEnabled||control.enabled||(control.pauseUntil&&control.pauseUntil>now))return {kind:"PAUSED" as const};
  if(control.workerLeaseUntil&&control.workerLeaseUntil>now)return {kind:"WAIT" as const,nextAttemptAt:control.workerLeaseUntil,reason:"COORDINATOR_LEASE"};
  if(control.nextPermitAt&&control.nextPermitAt>now)return {kind:"WAIT" as const,nextAttemptAt:control.nextPermitAt,reason:"SHARED_PERMIT"};
  const urgent=control.simulationLaneCursor%4!==3;
  const candidates=await tx.$queryRaw<{id:string;priority:number}[]>`SELECT o.id,o.priority FROM "NotificationOutbox" o JOIN "NotificationControl" k ON k.key='kind:'||o.kind WHERE o."engineeringTransport" IS NULL AND o."captureAttempts"=0 AND o."processingState" IN ('PENDING','RETRY_PENDING') AND o.kind<>'EXPORT_AVAILABLE' AND o."scheduledAt"<=${now} AND (o."nextAttemptAt" IS NULL OR o."nextAttemptAt"<=${now}) AND (o."latestSendAt" IS NULL OR o."latestSendAt">${now}) AND (NOT o.simulated OR o."providerScope"=${c.scope}) AND k."captureEnabled" AND k."simulationEnabled" AND NOT k.enabled AND (k."pauseUntil" IS NULL OR k."pauseUntil"<=${now}) ORDER BY CASE WHEN (o.priority<=1)=${urgent} THEN 0 ELSE 1 END,o."scheduledAt",o.id LIMIT 1`;
  if(!candidates.length){const next=await tx.notificationOutbox.findFirst({where:{engineeringTransport:null,captureAttempts:0,processingState:{in:["PENDING","RETRY_PENDING"]},kind:{not:"EXPORT_AVAILABLE"},OR:[{simulated:false},{providerScope:c.scope}]},orderBy:{nextAttemptAt:"asc"},select:{nextAttemptAt:true,scheduledAt:true}});return {kind:"WAIT" as const,nextAttemptAt:new Date(Math.max(+now+1000,+(next?.nextAttemptAt??next?.scheduledAt??new Date(+now+60000)))),reason:"NO_DUE_WORK"};}
  await tx.notificationControl.update({where:{key:"GLOBAL"},data:{workerLeaseToken:token,workerLeaseUntil:new Date(+now+30000)}});return {kind:"DISPATCH" as const,id:candidates[0].id};
 });
 if(plan.kind!=="DISPATCH")return plan;
 try{const outcome=await dispatchSimulation(plan.id,provider);return {kind:"PROCESSED" as const,outcome,nextAttemptAt:(await prisma.notificationControl.findUniqueOrThrow({where:{key:"GLOBAL"},select:{nextPermitAt:true}})).nextPermitAt??new Date(Date.now()+1000)};}
 finally{await prisma.notificationControl.updateMany({where:{key:"GLOBAL",workerLeaseToken:token},data:{workerLeaseToken:null,workerLeaseUntil:null}});}
}
