import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { Prisma, type NotificationSource } from "@prisma/client";
import { prisma } from "../db/prisma";
import { resolveLifecycle } from "../lifecycle/service";
import { MILESTONES, type Audience, type Milestone, type NotificationKind } from "./registry";
import { digest } from "./config";
type DB = Prisma.TransactionClient;
export type Intent = {kind:NotificationKind;audience:Audience;userId?:string};
export type Evaluation = {intents:Intent[];code?:string;waiting?:boolean};
export async function evaluateSource(s:NotificationSource,tx:DB,now:Date):Promise<Evaluation> {
 const no=(code:string,waiting=false):Evaluation=>({intents:[],code,waiting});
 if(s.state==="HISTORICAL_REVIEW"||s.state==="AUDIT_ONLY")return no(s.state);
 if(s.scheduledAt && s.scheduledAt>now)return no("NOT_DUE",true);
 if(s.latestSendAt && s.latestSendAt<=now)return no("SEND_WINDOW_EXPIRED");
 const w=await tx.workspace.findUnique({where:{id:s.workspaceId!},select:{activationStatus:true}});
 if(!w || w.activationStatus==="CLOSED")return no("WORKSPACE_RESTRICTED");
 const owner=(kind:NotificationKind):Evaluation=>({intents:[{kind,audience:"OWNERS"}]});
 if(s.kind==="MILESTONE"){
  const p=await tx.subscriptionPeriod.findUniqueOrThrow({where:{id:s.periodId!}});
  if(p.revokedAt||w.activationStatus!=="ACTIVE")return no("COVERAGE_RESTRICTED");
  if(await tx.subscriptionPeriod.count({where:{workspaceId:s.workspaceId!,id:{not:p.id},revokedAt:null,startsAt:{lte:now},endsAt:{gt:now}}}))return no("CURRENT_COVERAGE_REPLACED_EPISODE");
  if(await tx.subscriptionPeriod.count({where:{workspaceId:s.workspaceId!,revokedAt:null,startsAt:{lte:p.endsAt},endsAt:{gt:p.endsAt}}}))return no("SUPERSEDED_COVERAGE");
  if(["ARCHIVE","CANCEL"].includes(s.milestone!)&&!s.lifecycleEventId)return no("WAITING_FOR_TRANSITION",true);
  if(s.milestone!.startsWith("RETENTION")){
   const l=await tx.workspaceLifecycle.findUnique({where:{workspaceId:s.workspaceId!}});
   if(l?.sourcePeriodId!==p.id||!l.cancellationEffectiveAt)return no("WAITING_FOR_CANCELLATION",true);
  }
  return owner(MILESTONES[s.milestone as Milestone][1]);
 }
 if(s.kind==="QUOTE"||s.kind==="QUOTE_ACCEPTED"){
  const r=await tx.subscriptionRequest.findUniqueOrThrow({where:{id:s.requestId!}});
  if(!r.approvedAt||["REJECTED","CANCELLED","ACTIVATED"].includes(r.status))return no("QUOTE_SUPERSEDED");
  if(s.kind==="QUOTE"&&r.quoteAcceptedAt)return no("QUOTE_ALREADY_ACCEPTED");
  return owner(s.kind==="QUOTE"?"QUOTE_READY":"QUOTE_ACCEPTED");
 }
 if(s.kind==="PAYMENT_SUBMITTED"||s.kind==="PAYMENT_REJECTED"){
  const p=await tx.subscriptionPayment.findUniqueOrThrow({where:{id:s.paymentId!}});
  if(s.kind==="PAYMENT_REJECTED")return p.status==="REJECTED"?owner("PAYMENT_REVIEW_UPDATED"):no("PAYMENT_SUPERSEDED");
  if(p.status!=="SUBMITTED")return no("PAYMENT_SUPERSEDED");
  return {intents:[{kind:"PAYMENT_CLAIM_RECEIVED",audience:"OWNERS"},{kind:"PAYMENT_REVIEW_REQUIRED",audience:"BILLING"}]};
 }
 if(s.kind==="RECEIPT"){
  if(await tx.subscriptionPaymentReversal.count({where:{receiptId:s.receiptId!}}))return no("RECEIPT_REVERSED");
  return owner("PAYMENT_VERIFIED");
 }
 if(s.kind==="REVERSAL")return {intents:[{kind:"PAYMENT_STATUS_CHANGED",audience:"OWNERS"},{kind:"PAYMENT_REVIEW_REQUIRED",audience:"BILLING"}]};
 if(s.kind==="REQUEST_CLOSED")return owner("COMMERCIAL_REQUEST_CLOSED");
 if(s.kind==="PERIOD"){
  const p=await tx.subscriptionPeriod.findUniqueOrThrow({where:{id:s.periodId!}});
  if(p.revokedAt||w.activationStatus!=="ACTIVE")return no("COVERAGE_RESTRICTED");
  const result=owner("SUBSCRIPTION_CONFIRMED");
  const recovery=await tx.workspaceRecoveryRequest.findUnique({where:{activationPeriodId:p.id}});
  if(recovery?.activatedAt && recovery.status==="APPROVED" && recovery.ownershipVerifiedAt && recovery.identityCheckedAt){
   const user=await tx.user.findUnique({where:{id:recovery.requesterId}});
   if(user?.externalId===recovery.requesterExternalId && createHash("sha256").update(user.email.toLowerCase()).digest("hex")===recovery.emailHash)result.intents.push({kind:"SUBSCRIPTION_CONFIRMED",audience:"CLAIMANT",userId:user.id});
  }
  return result;
 }
 if(s.kind!=="LIFECYCLE")return no("AUDIT_ONLY");
 const e=await tx.workspaceLifecycleEvent.findUniqueOrThrow({where:{id:s.lifecycleEventId!}});
 if(e.exportId){
  const x=await tx.workspaceExportRequest.findUniqueOrThrow({where:{id:e.exportId},select:{requesterId:true,sourcePeriodId:true,recoveryId:true,status:true,expiresAt:true,availabilityVersion:true,artifactExpiresAt:true,generatedAt:true,requesterExternalId:true,requesterEmailHash:true}});
  const kind=({EXPORT_REQUESTED:"EXPORT_REQUEST_ACCEPTED",EXPORT_READY:"EXPORT_AVAILABLE",EXPORT_FAILED:"EXPORT_PREPARATION_FAILED",EXPORT_EXPIRED:"EXPORT_UNAVAILABLE"} as const)[e.type as "EXPORT_REQUESTED"];
  if(!kind)return no("AUDIT_ONLY");
  if(e.type==="EXPORT_READY"||e.type==="EXPORT_REQUESTED"){
   if(x.availabilityVersion===2){const u=await tx.user.findUnique({where:{id:x.requesterId},select:{externalId:true,email:true}});if(!u||u.externalId!==x.requesterExternalId||createHash("sha256").update(u.email.toLowerCase()).digest("hex")!==x.requesterEmailHash)return no("EXPORT_IDENTITY_CHANGED");}
   const deadline=e.type==="EXPORT_READY"?(x.availabilityVersion===2?x.artifactExpiresAt:x.expiresAt):x.expiresAt;
   if(!deadline||deadline<=now||e.type==="EXPORT_READY"&&x.availabilityVersion===2&&+deadline-+now<30*60000||!(e.type==="EXPORT_READY"?x.status==="READY":["REQUESTED","PROCESSING"].includes(x.status)))return no("EXPORT_STALE");
   if(w.activationStatus!=="ACTIVE")return no("WORKSPACE_RESTRICTED");
   const lifecycle=await resolveLifecycle(s.workspaceId!,tx,now);
   if(lifecycle.retentionExpired)return no("RETENTION_WINDOW_EXPIRED");
   const accessDeadline=x.recoveryId?lifecycle.retentionEndsAt:lifecycle.cancellationAt;
   if(e.type==="EXPORT_READY"&&x.availabilityVersion===2&&accessDeadline&&+accessDeadline-+now<30*60000)return no("EXPORT_USEFUL_WINDOW_MISSED");
   const canceled=lifecycle.state==="CANCELED";
   const ownerMember=await tx.workspaceMember.findUnique({where:{userId_workspaceId:{userId:x.requesterId,workspaceId:s.workspaceId!}}});
   const episode=lifecycle.journal?.episodeId??lifecycle.period?.id;
   if(x.recoveryId){const g=await tx.workspaceRecoveryRequest.findUnique({where:{id:x.recoveryId},select:{expiresAt:true}});if(e.type==="EXPORT_READY"&&x.availabilityVersion===2&&(!g?.expiresAt||+g.expiresAt-+now<30*60000))return no("EXPORT_USEFUL_WINDOW_MISSED");if(!episode||!await validGrant(tx,x.recoveryId,x.requesterId,now,true,episode,s.workspaceId!))return no("EXPORT_AUTHORITY_REVOKED");}
   else if(canceled||ownerMember?.role!=="OWNER"||ownerMember.status!=="ACTIVE")return no("EXPORT_AUTHORITY_REVOKED");
  }
  return {intents:[{kind,audience:"CLAIMANT",userId:x.requesterId}]};
 }
 if(e.recoveryId){
  const r=await tx.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:e.recoveryId}});
  const claimant=await tx.user.findUnique({where:{id:r.requesterId},select:{externalId:true}});
  if(claimant?.externalId!==r.requesterExternalId)return no("RECOVERY_IDENTITY_CONFLICT");
  const kinds:Partial<Record<typeof e.type,NotificationKind>>={RECOVERY_REQUESTED:"RECOVERY_REQUEST_ACCEPTED",RECOVERY_APPROVED:"RECOVERY_REVIEW_UPDATED",RECOVERY_REJECTED:"RECOVERY_REVIEW_UPDATED",RECOVERY_REVOKED:"RECOVERY_ACCESS_WITHDRAWN",RECOVERY_GRANT_EXPIRED:"RECOVERY_ACCESS_EXPIRED"};
  const kind=kinds[e.type];if(!kind)return no("AUDIT_ONLY");
  if(e.type==="RECOVERY_REQUESTED"&&r.status!=="PENDING")return no("RECOVERY_SUPERSEDED");
  if(e.type==="RECOVERY_APPROVED"){
   const life=await resolveLifecycle(s.workspaceId!,tx,now),episode=life.journal?.episodeId??life.period?.id;
   if(!episode||life.retentionExpired||!await validGrant(tx,r.id,r.requesterId,now,false,episode,s.workspaceId!))return no("RECOVERY_STALE");
  }
  const expected={RECOVERY_REJECTED:"REJECTED",RECOVERY_REVOKED:"REVOKED",RECOVERY_GRANT_EXPIRED:"EXPIRED"}[e.type as "RECOVERY_REJECTED"];
  if(expected&&r.status!==expected)return no("RECOVERY_SUPERSEDED");
  return {intents:[{kind,audience:"CLAIMANT",userId:r.requesterId},...(e.type==="RECOVERY_REQUESTED"?[{kind:"RECOVERY_REVIEW_REQUIRED" as const,audience:"SUPER" as const}]:[])]};
 }
 return no("AUDIT_ONLY");
}
async function validGrant(tx:DB,id:string,userId:string,now:Date,exportOnly=false,episode?:string,workspaceId?:string){
 const r=await tx.workspaceRecoveryRequest.findUnique({where:{id}}),u=await tx.user.findUnique({where:{id:userId}});
 return !!(r&&u&&r.requesterId===userId&&(!episode||r.sourcePeriodId===episode)&&(!workspaceId||r.workspaceId===workspaceId)&&r.requesterExternalId===u.externalId&&r.emailHash===createHash("sha256").update(u.email.toLowerCase()).digest("hex")&&r.status==="APPROVED"&&!r.revokedAt&&!r.activatedAt&&r.expiresAt&&r.expiresAt>now&&r.identityCheckedAt&&r.ownershipVerifiedAt&&(exportOnly?r.allowExport:r.allowExport||r.allowReactivation));
}
export async function audienceUsers(s:NotificationSource,intent:Intent,tx:DB){
 if(intent.audience==="CLAIMANT")return intent.userId?[intent.userId]:[];
 if(intent.audience==="OWNERS")return (await tx.workspaceMember.findMany({where:{workspaceId:s.workspaceId!,role:"OWNER",status:"ACTIVE"},select:{userId:true},take:51})).map(r=>r.userId);
 return (await tx.platformAdmin.findMany({where:{active:true,role:{in:intent.audience==="SUPER"?["SUPER_ADMIN"]:["SUPER_ADMIN","BILLING_ADMIN"]}},select:{userId:true},take:51})).map(r=>r.userId);
}
export async function verifyRecipient(userId:string){
 const allowed=(process.env.COREOPS_NOTIFICATION_TEST_USER_IDS??"").split(",").filter(Boolean);
 if(allowed.length>100 || !allowed.includes(userId))return null;
 const u=await prisma.user.findUnique({where:{id:userId},select:{externalId:true,email:true}});
 if(!u?.externalId)return null;
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const c=await clerkClient();
  const p=await Promise.race([c.users.getUser(u.externalId),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Identity unavailable")),4000);})]);
  const email=p.emailAddresses.find(e=>e.id===p.primaryEmailAddressId);
  if(p.id!==u.externalId||p.banned||p.locked||email?.verification?.status!=="verified"||email.emailAddress.trim().toLowerCase()!==u.email.trim().toLowerCase())return null;
  return {binding:digest(`${u.externalId}:${u.email.trim().toLowerCase()}`),destination:digest(email.emailAddress.trim().toLowerCase(),"destination")};
 }finally{if(timer)clearTimeout(timer);}
}
export async function recipientStillMatches(tx:DB,userId:string,binding:string){
 const u=await tx.user.findUnique({where:{id:userId},select:{externalId:true,email:true}});
 return !!u?.externalId&&digest(`${u.externalId}:${u.email.trim().toLowerCase()}`)===binding;
}
