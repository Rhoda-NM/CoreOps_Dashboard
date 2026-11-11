import "server-only";
import { z } from "zod";
import type { NotificationProvider, ProviderResult } from "../fake-provider";
import type { FrozenEnvelope } from "../envelope";
import { LocalResendMockTransport } from "./local-transport";
import { requireResendEngineering } from "./release";
import { resendRequest } from "./envelope";
export type ResendFailure="AUTHENTICATION"|"VALIDATION"|"CONFIGURATION"|"RATE_LIMIT"|"PROTOCOL_UNKNOWN"|"TRANSPORT_UNKNOWN";
export type ResendResult=ProviderResult&{category?:ResendFailure};
export function retryAfter(headers:Headers,now:Date){const raw=headers.get("retry-after"),seconds=raw&&/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):NaN;const date=raw?Date.parse(raw):NaN;const ms=Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-+now:Number(headers.get("ratelimit-reset")??60)*1000;return Math.max(1000,Number.isFinite(ms)&&ms<=86400000?ms:86400000);}
export class ResendProviderAdapter implements NotificationProvider {
 constructor(private transport:LocalResendMockTransport,private timeoutMs=3000){requireResendEngineering();if(!(transport instanceof LocalResendMockTransport)||!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>5000)throw new Error("Mock-only Resend adapter required");}
 async send(envelope:FrozenEnvelope,now:Date):Promise<ResendResult>{
  requireResendEngineering();const body=JSON.stringify(resendRequest(envelope)),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{
   // Official POST /emails contract; one attempt, no SDK or hidden retries.
   const r=await this.transport.request("/emails","POST",{"Authorization":"Bearer re_engineering_mock_not_a_live_key","Content-Type":"application/json","Idempotency-Key":envelope.providerKey},body,controller.signal);
   if(r.status===429)return {type:"RATE_LIMITED",retryAfterMs:retryAfter(r.headers,now),category:"RATE_LIMIT"};
   if(r.status===401||r.status===403)return {type:"REJECTED",category:"AUTHENTICATION"};
   if([400,404,422].includes(r.status))return {type:"REJECTED",category:r.status===404?"CONFIGURATION":"VALIDATION"};
   if(r.status>=200&&r.status<300){let parsed:unknown;try{parsed=JSON.parse(r.body.toString("utf8"));}catch{return {type:"UNKNOWN",category:"PROTOCOL_UNKNOWN"};}const result=z.object({id:z.string().uuid()}).safeParse(parsed);return result.success?{type:"ACCEPTED",messageId:result.data.id}:{type:"UNKNOWN",category:"PROTOCOL_UNKNOWN"};}
   // 409, 5xx, redirects and unclassified responses do not prove non-acceptance.
   return {type:"UNKNOWN",category:"PROTOCOL_UNKNOWN"};
  }catch{return {type:"UNKNOWN",category:"TRANSPORT_UNKNOWN"};}finally{clearTimeout(timer);}
 }
 async lookup(_key:string):Promise<never>{void _key;requireResendEngineering();throw new Error("Resend has no verified idempotency-key lookup in this adapter; UNKNOWN requires message mapping or reviewed reconciliation");}
 async retrieveMapped(messageId:string,expected:{to:string;from:string;subject:string}){
  requireResendEngineering();z.string().uuid().parse(messageId);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{const r=await this.transport.request(`/emails/${messageId}`,"GET",{Authorization:"Bearer re_engineering_mock_not_a_live_key"},undefined,controller.signal);if(r.status!==200)throw new Error("Mapped message unavailable");const e=z.object({id:z.string().uuid(),to:z.array(z.string()).length(1),from:z.string(),subject:z.string(),last_event:z.string()}).parse(JSON.parse(r.body.toString()));if(e.id!==messageId||e.to[0]!==expected.to||e.from!==expected.from||e.subject!==expected.subject)throw new Error("Mapped message identity conflict");return {messageId:e.id,lastEvent:e.last_event};}catch{throw new Error("Provider reconciliation unavailable or conflicting");}finally{clearTimeout(timer);}
 }
}
