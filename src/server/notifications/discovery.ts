import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { utcDays } from "../lifecycle/policy";
import { EVIDENCE_POLICY, historyCutover, NOTIFICATION_POLICY, requireNotificationRehearsal } from "./config";
import { MILESTONES, type Milestone } from "./registry";

type Candidate = { id: string; workspaceId: string; effectiveAt: Date; receiptId?: string; resourceId?: string };
// All identifiers/fragments are closed code, never request parameters. Each adapter
// performs an anti-join independent of commit/recorded timestamp ordering.
const facts = [
  {kind:"QUOTE", table:"SubscriptionRequest", time:'"approvedAt"', where:'f."approvedAt" IS NOT NULL', field:"requestId"},
  {kind:"QUOTE_ACCEPTED", table:"SubscriptionRequest", time:'"quoteAcceptedAt"', where:'f."quoteAcceptedAt" IS NOT NULL', field:"requestId"},
  {kind:"PAYMENT_SUBMITTED", table:"SubscriptionPayment", time:'"createdAt"', where:"f.method <> 'PAYSTACK'", field:"paymentId"},
  {kind:"RECEIPT", table:"SubscriptionPaymentReceipt", time:'"verifiedAt"', where:"true", field:"receiptId"},
  {kind:"PERIOD", table:"SubscriptionPeriod", time:'"createdAt"', where:"true", field:"periodId"},
  {kind:"CHECKOUT_AUDIT", table:"AuditLog", time:'"createdAt"', where:"f.action = 'PAYSTACK_CHECKOUT_REQUESTED'", field:"auditLogId"},
  {kind:"PAYMENT_REJECTED", table:"PlatformAuditEvent", time:'"createdAt"', where:"f.action = 'PAYMENT_SUBMISSION_REJECTED' AND f.\"workspaceId\" IS NOT NULL", field:"platformAuditId"},
  {kind:"REQUEST_CLOSED", table:"PlatformAuditEvent", time:'"createdAt"', where:"f.action = 'REQUEST_CLOSED' AND f.\"workspaceId\" IS NOT NULL", field:"platformAuditId"},
] as const;
export async function reconcileNotificationSources(limit = 40) {
  requireNotificationRehearsal();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid discovery bound");
  return prisma.$transaction(async tx => {
    const lock = await tx.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(9031199) AS locked`;
    if (!lock[0].locked) return { discovered:0, busy:true };
    const control = await tx.notificationControl.findUnique({where:{key:"GLOBAL"}});
    if (!control?.captureEnabled || (control.pauseUntil && control.pauseUntil > new Date())) return {discovered:0, disabled:true};
    const cutover = historyCutover(); let discovered=0;
    async function put(data: Prisma.NotificationSourceUncheckedCreateInput) {
      if (!cutover || new Date(data.effectiveAt) < cutover) { data.state="HISTORICAL_REVIEW";data.dispositionCode="HISTORY_NOT_APPROVED"; }
      const row=await tx.notificationSource.upsert({where:{canonicalKey:data.canonicalKey},create:data,update:{}});
      discovered++; return row;
    }
    const common = {scope:"TENANT" as const,policyVersion:NOTIFICATION_POLICY};
    const adapters = [
      ...facts.map(f=>async(take:number)=>{
        const extra=f.field==="platformAuditId"?', f."resourceId"':'';
        const rows=await tx.$queryRawUnsafe<Candidate[]>(`SELECT f.id,f."workspaceId", f.${f.time} AS "effectiveAt"${extra} FROM "${f.table}" f WHERE ${f.where} AND NOT EXISTS(SELECT 1 FROM "NotificationSource" s WHERE s."canonicalKey" = '${f.kind}:' || f.id) ORDER BY f.id LIMIT $1`,take);
        for(const r of rows) await put({...common,kind:f.kind,canonicalKey:`${f.kind}:${r.id}`,workspaceId:r.workspaceId,effectiveAt:r.effectiveAt,scheduledAt:r.effectiveAt,latestSendAt:utcDays(r.effectiveAt,1),[f.field]:r.id,...(f.kind==="PAYMENT_REJECTED"?{paymentId:r.resourceId}:{}),...(f.kind==="REQUEST_CLOSED"?{requestId:r.resourceId}:{}),...(f.kind==="CHECKOUT_AUDIT"?{state:"AUDIT_ONLY" as const,dispositionCode:"CHECKOUT_NOT_PAYMENT"}:{})});
      }),
      async(take:number)=>{
        const rows=await tx.$queryRawUnsafe<Candidate[]>(`SELECT f.id,p."workspaceId",f."receiptId",f."reversedAt" AS "effectiveAt" FROM "SubscriptionPaymentReversal" f JOIN "SubscriptionPaymentReceipt" p ON p.id=f."receiptId" WHERE NOT EXISTS(SELECT 1 FROM "NotificationSource" s WHERE s."canonicalKey"='REVERSAL:'||f.id) ORDER BY f.id LIMIT $1`,take);
        for(const r of rows)await put({...common,kind:"REVERSAL",canonicalKey:`REVERSAL:${r.id}`,workspaceId:r.workspaceId,reversalId:r.id,receiptId:r.receiptId,effectiveAt:r.effectiveAt,scheduledAt:r.effectiveAt,latestSendAt:utcDays(r.effectiveAt,1)});
      },
      ...Object.keys(MILESTONES).map(key=>async(take:number)=>{
        const milestone=key as Milestone,[days,,required]=MILESTONES[milestone];
        const rows=await tx.$queryRawUnsafe<Candidate[]>(`SELECT f.id,f."workspaceId", f."endsAt" AS "effectiveAt" FROM "SubscriptionPeriod" f WHERE NOT EXISTS(SELECT 1 FROM "NotificationSource" s WHERE s."canonicalKey"='MILESTONE:'||f.id||':${milestone}') ORDER BY f.id LIMIT $1`,take);
        for(const r of rows){const due=utcDays(r.effectiveAt,days);const source=await put({...common,kind:"MILESTONE",canonicalKey:`MILESTONE:${r.id}:${milestone}`,workspaceId:r.workspaceId,periodId:r.id,milestone,effectiveAt:due,scheduledAt:due,latestSendAt:utcDays(due,1),state:["ARCHIVE","CANCEL"].includes(milestone)?"WAITING_FOR_TRANSITION":"PENDING"});
          if(required)await tx.lifecycleNotice.upsert({where:{sourceId:source.id},create:{sourceId:source.id,obligationKey:source.canonicalKey,milestone,dueAt:due,required:true,state:"REVIEW_REQUIRED",recipientPolicyVersion:NOTIFICATION_POLICY,evidencePolicyVersion:EVIDENCE_POLICY},update:{}});
        }
      }),
      async(take:number)=>{
        const rows=await tx.workspaceLifecycleEvent.findMany({where:{notificationSource:null},orderBy:{id:"asc"},take});
        for(const e of rows){
          const milestone=e.type==="WORKSPACE_ARCHIVED"?"ARCHIVE":e.type==="WORKSPACE_CANCELED"?"CANCEL":null;
          if(milestone){
            const p=await tx.subscriptionPeriod.findUniqueOrThrow({where:{id:e.episodeId}}),due=utcDays(p.endsAt,MILESTONES[milestone][0]);
            const s=await put({...common,kind:"MILESTONE",canonicalKey:`MILESTONE:${p.id}:${milestone}`,workspaceId:e.workspaceId,periodId:p.id,milestone,effectiveAt:due,scheduledAt:due,latestSendAt:utcDays(due,1)});
            await tx.notificationSource.update({where:{id:s.id},data:{lifecycleEventId:e.id,...(s.state==="WAITING_FOR_TRANSITION"?{state:"PENDING" as const}:{})}});
            await tx.lifecycleNotice.upsert({where:{sourceId:s.id},create:{sourceId:s.id,obligationKey:s.canonicalKey,milestone,dueAt:due,required:true,state:"REVIEW_REQUIRED",recipientPolicyVersion:NOTIFICATION_POLICY,evidencePolicyVersion:EVIDENCE_POLICY},update:{}});
          }else{
            const audit=["EXPORT_DOWNLOAD_AUTHORIZED","WORKSPACE_REACTIVATED","WORKSPACE_RESTORED"].includes(e.type);
            await put({...common,kind:"LIFECYCLE",canonicalKey:`LIFECYCLE:${e.id}`,workspaceId:e.workspaceId,lifecycleEventId:e.id,effectiveAt:e.effectiveAt,scheduledAt:e.effectiveAt,latestSendAt:utcDays(e.effectiveAt,1),...(audit?{state:"AUDIT_ONLY" as const,dispositionCode:e.type==="EXPORT_DOWNLOAD_AUTHORIZED"?"AUDIT_ONLY":"COALESCED_BY_PAID_PERIOD"}:{})});
          }
        }
      }
    ];
    // Fair adapter rotation; per-adapter caps prevent a busy source starving others.
    let cursor=control.discoveryCursor%adapters.length;
    for(let i=0;i<adapters.length && discovered<limit;i++){await adapters[cursor](Math.min(5,limit-discovered));cursor=(cursor+1)%adapters.length;}
    await tx.notificationControl.update({where:{key:"GLOBAL"},data:{discoveryCursor:cursor}});
    return {discovered};
  },{timeout:15000});
}
