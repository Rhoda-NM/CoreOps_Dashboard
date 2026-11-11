import "server-only";
import { Webhook } from "svix";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { requireCentralHost } from "../../routing/request-context";
import { sha, decryptEnvelope } from "../envelope";
import { fingerprint, lookupKeys } from "../simulation-config";
import { requireResendEngineering } from "./release";
import { verifyCorrelation, type ResendEnvelope } from "./envelope";
const schema=z.object({type:z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/),created_at:z.string().datetime(),data:z.object({email_id:z.string().uuid(),from:z.string().max(320),to:z.array(z.string().email()).max(50),tags:z.record(z.string(),z.string()).optional()}).passthrough()}).passthrough();
export class ResendWebhookAuthenticationError extends Error {}
const outcomes={"email.sent":"PROVIDER_ACCEPTED","email.delivered":"DELIVERED_TO_SERVER","email.delivery_delayed":"DELAYED","email.bounced":"BOUNCED","email.complained":"COMPLAINED","email.failed":"FAILED","email.suppressed":"FAILED"} as const;
export async function ingestResendWebhook(raw:Buffer,headers:Headers){
 const c=requireResendEngineering();if(raw.length>65536)throw new Error("Webhook exceeds bound");
 const secret=process.env.COREOPS_RESEND_ENGINEERING_WEBHOOK_SECRET??"";
 if(!/^whsec_[A-Za-z0-9+/=]+$/.test(secret)||Buffer.from(secret.slice(6),"base64").length!==32)throw new Error("Engineering signing configuration unavailable");
 const id=headers.get("svix-id")??"",timestamp=headers.get("svix-timestamp")??"",signature=headers.get("svix-signature")??"";
 if(!/^[a-zA-Z0-9_-]{1,200}$/.test(id)||signature.length>2048)throw new ResendWebhookAuthenticationError("Invalid webhook");
 // Svix 2.10 verifies bytes and returns void; parse only after successful verification.
 try{new Webhook(secret).verify(raw,{"svix-id":id,"svix-timestamp":timestamp,"svix-signature":signature});}catch{throw new ResendWebhookAuthenticationError("Invalid webhook");}
 let parsed:unknown;try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}catch{parsed=null;}
 const result=schema.safeParse(parsed),e=result.success?result.data:null,tag=e?.data.tags?.notification_id;
 const candidate=tag&&/^[a-zA-Z0-9_-]{1,100}$/.test(tag)?tag:null,now=new Date(),bodyDigest=sha(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`${c.scope}:resend:${id}`},0))`;
  const old=await tx.notificationProviderEvent.findUnique({where:{providerScope_providerEventId:{providerScope:c.scope,providerEventId:id}}});
  if(old){if(old.evidenceProtocol!=="RESEND_SVIX_MOCK"||old.bodyDigest!==bodyDigest){await tx.notificationProviderEvent.update({where:{id:old.id},data:{state:"QUARANTINED",failureCode:"RESEND_EVENT_CONFLICT"}});return {state:"CONFLICT"};}return {state:old.state};}
  const o=candidate?await tx.notificationOutbox.findUnique({where:{id:candidate}}):e?await tx.notificationOutbox.findUnique({where:{providerScope_providerMessageId:{providerScope:c.scope,providerMessageId:e.data.email_id}}}):null;
  const key=o?.identityKeyVersion?lookupKeys().find(k=>k.version===o.identityKeyVersion):null;
  const destination=e&&e.data.to.length===1&&key?fingerprint(key.key,e.data.to[0].trim().toLowerCase(),"destination"):null;
  const stored=await tx.notificationProviderEvent.create({data:{simulated:true,evidenceProtocol:"RESEND_SVIX_MOCK",providerScope:c.scope,providerEventId:id,providerMessageId:e?.data.email_id,candidateNotificationId:candidate,eventType:e?.type??"MALFORMED_RESEND_EVENT",occurredAt:e?new Date(e.created_at):null,verifiedAt:now,verificationKeyRef:`RESEND_SVIX_MOCK:${sha(secret).slice(0,24)}`,bodyDigest,destinationDigest:destination,state:"QUARANTINED",failureCode:"UNMATCHED_RESEND_EVENT"}});
  if(!e||!o||!key||o.engineeringTransport!=="RESEND_HTTP_MOCK"||!o.simulated||o.providerScope!==c.scope||!o.frozenPayloadCipher||!o.payloadHash||!o.firstDispatchedAt||e.data.to.length!==1||destination!==o.destinationDigest||+new Date(e.created_at)<+o.firstDispatchedAt||+new Date(e.created_at)>+now+60000)return {state:"QUARANTINED"};
  const envelope=decryptEnvelope(o.frozenPayloadCipher,o.id,o.payloadHash) as ResendEnvelope;
  if(e.data.from!==envelope.from||e.data.to[0]!==envelope.to||!verifyCorrelation(envelope,e.data.tags??{},o.identityKeyVersion!)||!(e.type in outcomes))return {state:"QUARANTINED"};
  await tx.$queryRaw`SELECT id FROM "NotificationOutbox" WHERE id=${o.id} FOR UPDATE`;
  const current=await tx.notificationOutbox.findUniqueOrThrow({where:{id:o.id}});if(current.providerMessageId&&current.providerMessageId!==e.data.email_id)return {state:"QUARANTINED"};
  const outcome=outcomes[e.type as keyof typeof outcomes],rank={NOT_SENT:0,UNKNOWN:0,PROVIDER_ACCEPTED:1,DELAYED:2,FAILED:3,DELIVERED_TO_SERVER:4,BOUNCED:5,COMPLAINED:6},at=new Date(e.created_at);
  await tx.notificationOutbox.update({where:{id:o.id},data:{providerMessageId:e.data.email_id,deliveryOutcome:rank[outcome]>rank[current.deliveryOutcome]?outcome:current.deliveryOutcome,acceptedAt:outcome==="FAILED"?current.acceptedAt:current.acceptedAt??at,deliveredAt:outcome==="DELIVERED_TO_SERVER"?current.deliveredAt??at:current.deliveredAt,bouncedAt:outcome==="BOUNCED"?current.bouncedAt??at:current.bouncedAt,complainedAt:outcome==="COMPLAINED"?current.complainedAt??at:current.complainedAt,processingState:"SETTLED",leaseToken:null,leaseUntil:null,completedAt:now}});
  await tx.notificationProviderEvent.update({where:{id:stored.id},data:{notificationId:o.id,state:"APPLIED",failureCode:null,processedAt:now}});
  if(outcome==="BOUNCED"||outcome==="COMPLAINED"||e.type==="email.suppressed")await tx.notificationSuppression.upsert({where:{providerScope_channel_digestKeyVersion_destinationDigest:{providerScope:c.scope,channel:"EMAIL",digestKeyVersion:o.identityKeyVersion!,destinationDigest:o.destinationDigest!}},create:{providerScope:c.scope,channel:"EMAIL",digestKeyVersion:o.identityKeyVersion!,destinationDigest:o.destinationDigest!,providerEventId:stored.id,reasonCode:`RESEND_HTTP_MOCK_${outcome}`},update:{active:true,releasedAt:null,releaseReason:null}});
  return {state:"APPLIED"};
 });
}
async function boundedBody(request:Request){
 const declared=request.headers.get("content-length");if(declared&&(!/^\d+$/.test(declared)||Number(declared)>65536))throw new Error("Webhook exceeds bound");
 if(!request.body)return Buffer.alloc(0);const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>65536)throw new Error("Webhook exceeds bound");chunks.push(r.value);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>{});}
}
export async function resendWebhookHandler(request:Request){
 const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
 if(request.method!=="POST")return Response.json({error:"Not found"},{status:404,headers});
 try{requireResendEngineering();await requireCentralHost();}catch{return Response.json({error:"Not found"},{status:404,headers});}
 let raw:Buffer;try{raw=await boundedBody(request);}catch{return Response.json({error:"Invalid request"},{status:413,headers});}
 try{const result=await ingestResendWebhook(raw,request.headers);return Response.json(result,{status:202,headers});}catch(error){
  // Authenticity/parsing failures are generic; storage failure is retryable and never ACKed.
  const auth=error instanceof ResendWebhookAuthenticationError;return Response.json({error:auth?"Invalid webhook":"Webhook unavailable"},{status:auth?400:503,headers});
 }
}
