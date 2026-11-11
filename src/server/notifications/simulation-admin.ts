import "server-only";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { requirePlatform } from "../commercial/platform-auth";
import { KINDS, type NotificationKind } from "./registry";
import { requireSimulation } from "./simulation-config";
import { FakeResendProvider } from "./fake-provider";
import { assertSimulationAdmission } from "./restore-simulation";
import { SIM_TEMPLATE, simTemplateDigest, renderEnvelope } from "./envelope";
export const BILLING_KINDS:readonly string[]=KINDS.filter(k=>k.startsWith("QUOTE")||k.startsWith("PAYMENT")||k.startsWith("COMMERCIAL")||k==="SUBSCRIPTION_CONFIRMED"||k==="RENEWAL_APPROACHING");
export function simulationAvailable(){try{requireSimulation();return true;}catch{return false;}}
export async function notificationDashboard(view="latest"){
 const admin=await requirePlatform("audit");requireSimulation();
 const where=admin.role==="BILLING_ADMIN"?{kind:{in:[...BILLING_KINDS]}}:{};
 const health=await prisma.notificationOutbox.groupBy({by:["kind","templateVersion","processingState","deliveryOutcome"],where,_count:true,orderBy:{kind:"asc"},take:500});
 const eventHealth=await prisma.notificationProviderEvent.groupBy({by:["state"],where:admin.role==="BILLING_ADMIN"?{notification:{kind:{in:[...BILLING_KINDS]}}}:{},_count:true});
 const oldest=await prisma.notificationOutbox.findFirst({where:{...where,processingState:{in:["PENDING","RETRY_PENDING","CLAIMED"]}},orderBy:{createdAt:"asc"},select:{createdAt:true}});
 const engineeringHealth={externalRelease:"BLOCKED" as const,providerAccount:"REQUIRES_EXTERNAL_CONFIRMATION" as const,domainVerification:"REQUIRES_EXTERNAL_CONFIRMATION" as const,verifier:"Svix 2.10.0 / isolated HTTP mock only",queueLagSeconds:oldest?Math.max(0,Math.floor((Date.now()-+oldest.createdAt)/1000)):0,signedMockEvents:await prisma.notificationProviderEvent.count({where:{evidenceProtocol:"RESEND_SVIX_MOCK",...(admin.role==="BILLING_ADMIN"?{notification:{kind:{in:[...BILLING_KINDS]}}}:{})}}),failures:await prisma.notificationOutbox.groupBy({by:["lastFailureCode"],where:{...where,lastFailureCode:{not:null}},_count:true,orderBy:{lastFailureCode:"asc"},take:30})};
 if(admin.role==="SUPPORT")return {role:admin.role,engineeringHealth,health,eventHealth,oldest:oldest?.createdAt??null,queue:[],runs:[],notices:[],suppressions:await prisma.notificationSuppression.count({where:{active:true}}),controls:[]};
 if(!["latest","queued","review"].includes(view))throw new Error("Invalid notification view");
 const queueFilter:Prisma.NotificationOutboxWhereInput=view==="queued"?{processingState:{in:["PENDING","RETRY_PENDING","CLAIMED"]}}:view==="review"?{OR:[{processingState:"MANUAL_REVIEW" as const},{deliveryOutcome:"UNKNOWN" as const}]}:{};
 const queue=await prisma.notificationOutbox.findMany({where:{...where,...queueFilter},orderBy:{createdAt:"desc"},take:100,select:{id:true,kind:true,templateVersion:true,processingState:true,deliveryOutcome:true,simulated:true,createdAt:true,acceptedAt:true,deliveredAt:true,bouncedAt:true,complainedAt:true,lastFailureCode:true}});
 const superAdmin=admin.role==="SUPER_ADMIN";
 return {role:admin.role,engineeringHealth,health,eventHealth,oldest:oldest?.createdAt??null,queue,runs:superAdmin?await prisma.notificationRun.findMany({orderBy:{startedAt:"desc"},take:25,select:{id:true,simulated:true,startedAt:true,completedAt:true,processedCount:true,retryCount:true,skippedCount:true,failedCount:true,failureCode:true,summary:true}}):[],notices:superAdmin?await prisma.lifecycleNotice.findMany({orderBy:{dueAt:"asc"},take:100,select:{id:true,milestone:true,dueAt:true,state:true}}):[],suppressions:superAdmin?await prisma.notificationSuppression.count({where:{active:true}}):null,controls:superAdmin?await prisma.notificationControl.findMany({orderBy:{key:"asc"},select:{key:true,simulationEnabled:true,captureEnabled:true,pauseUntil:true}}):[]};
}
async function adminTransaction<T>(reason:string,operation:(tx:Prisma.TransactionClient,adminId:string)=>Promise<T>){
 requireSimulation();const admin=await requirePlatform("activate");if(reason.trim().length<10||reason.length>300)throw new Error("A bounded review reason is required");
 return prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;const a=await tx.platformAdmin.findUniqueOrThrow({where:{id:admin.id}});if(!a.active||a.role!=="SUPER_ADMIN")throw new Error("Notification control forbidden");return operation(tx,a.id);});
}
export async function configureSimulation(kind:string,on:boolean,reason:string){
 if(kind!=="GLOBAL"&&!KINDS.includes(kind as NotificationKind))throw new Error("Unknown simulation kind");if(kind==="EXPORT_AVAILABLE"&&on)throw new Error("Export-ready dispatch requires N-X");
 return adminTransaction(reason,async(tx,adminId)=>{
  const key=kind==="GLOBAL"?kind:`kind:${kind}`;
  await tx.notificationControl.upsert({where:{key},create:{key,captureEnabled:on,simulationEnabled:on,policyVersion:"NB-CAPTURE-v1",settings:{}},update:{captureEnabled:on,simulationEnabled:on,configRevision:{increment:1}}});
  await tx.platformAuditEvent.create({data:{actorAdminId:adminId,action:"NOTIFICATION_SIMULATION_CONTROL",resourceType:"NotificationControl",resourceId:key,reason,metadata:{simulationEnabled:on}}});
 });
}
export async function initializeSimulationInstance(reason:string){
 // Deliberate reviewed local operation. No production bootstrap or credentials.
 await requirePlatform("activate");const c=requireSimulation(),provider=new FakeResendProvider();try{
  await provider.initialize();
  const records=await provider.records();for(const r of records){const o=await prisma.notificationOutbox.findUnique({where:{id:r.notification},select:{payloadHash:true,dispatchedAttempts:true}});if(!o||o.payloadHash!==r.hash||o.dispatchedAttempts===0)throw new Error("Cannot admit unreconciled restore");}
  await adminTransaction(reason,async(tx,adminId)=>{await tx.notificationSimulationInstance.upsert({where:{id:c.instance},create:{id:c.instance,scope:c.scope},update:{}});await tx.platformAuditEvent.create({data:{actorAdminId:adminId,action:"NOTIFICATION_SIMULATION_ADMISSION",resourceType:"NotificationSimulationInstance",resourceId:c.instance,reason}});});
  await provider.admission(true);await assertSimulationAdmission(provider);
 }finally{await provider.close();}
}
export async function replaceRejectedSimulation(id:string,reason:string){
 requireSimulation();await requirePlatform("activate");const initial=await prisma.notificationOutbox.findUniqueOrThrow({where:{id},select:{source:{select:{workspaceId:true}}}});
 // Match existing platform lock order: Workspace before PlatformAdmin.
 requireSimulation();const admin=await requirePlatform("activate");if(reason.trim().length<10||reason.length>300)throw new Error("Review reason required");
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${initial.source.workspaceId} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;const a=await tx.platformAdmin.findUniqueOrThrow({where:{id:admin.id}});if(!a.active||a.role!=="SUPER_ADMIN")throw new Error("Replacement forbidden");
  await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${id} FOR UPDATE`;const o=await tx.notificationOutbox.findUniqueOrThrow({where:{id}});
  if(!o.simulated||o.deliveryOutcome!=="FAILED"||o.providerMessageId||o.processingState!=="SETTLED"||await tx.notificationOutbox.count({where:{replacesId:id}}))throw new Error("Only known rejected, unreplaced simulations can be replaced");
  const audit=await tx.platformAuditEvent.create({data:{actorAdminId:a.id,workspaceId:initial.source.workspaceId,action:"NOTIFICATION_REPLACEMENT_REVIEWED",resourceType:"NotificationOutbox",resourceId:id,reason}}),next=randomUUID();
  return tx.notificationOutbox.create({data:{id:next,simulated:true,replacesId:id,replacementAuditId:audit.id,generation:o.generation+1,sourceId:o.sourceId,noticeId:o.noticeId,recipientUserId:o.recipientUserId,kind:o.kind,channel:o.channel,logicalKey:o.logicalKey,templateVersion:SIM_TEMPLATE,templateDigest:simTemplateDigest(o.kind as NotificationKind),recipientPolicyVersion:o.recipientPolicyVersion,scheduledAt:new Date(),latestSendAt:o.latestSendAt,priority:o.priority,providerScope:requireSimulation().scope,providerKey:`nc:${next}`}});
 });
}
export async function syntheticTemplatePreview(kind:NotificationKind){await requirePlatform("audit");requireSimulation();if(!KINDS.includes(kind))throw new Error("Unknown template");return renderEnvelope(kind,"synthetic-recipient@example.test","synthetic-preview","synthetic-key");}
