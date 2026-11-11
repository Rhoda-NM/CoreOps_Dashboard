import "server-only";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { sha, type FrozenEnvelope } from "../envelope";
import { lookupKeys } from "../simulation-config";
import { requireResendEngineering } from "./release";
export type ResendEnvelope=FrozenEnvelope&{replyTo:string;tags:{name:string;value:string}[]};
export function freezeResendFields(base:FrozenEnvelope):ResendEnvelope{
 const c=requireResendEngineering();if(base.providerScope!==c.scope||base.kind==="EXPORT_AVAILABLE")throw new Error("Resend envelope unavailable");
 const proof=createHmac("sha256",lookupKeys()[0].key).update(`resend-correlation:${c.scope}:${base.notificationId}:${base.providerKey}`).digest("hex");
 return {...base,replyTo:"support@example.test",tags:[{name:"notification_id",value:base.notificationId},{name:"account_binding",value:c.account},{name:"intent_proof",value:proof}]};
}
export function verifyCorrelation(e:ResendEnvelope,tags:Record<string,string>,keyVersion:string){
 const c=requireResendEngineering(),key=lookupKeys().find(k=>k.version===keyVersion);if(!key)return false;
 const proof=createHmac("sha256",key.key).update(`resend-correlation:${c.scope}:${e.notificationId}:${e.providerKey}`).digest("hex");
 return tags.notification_id===e.notificationId&&tags.account_binding===c.account&&tags.intent_proof===proof&&e.tags.some(t=>t.name==="intent_proof"&&t.value===proof);
}
export function resendRequest(e:FrozenEnvelope){
 const value=e as ResendEnvelope,c=requireResendEngineering();
 if(e.providerScope!==c.scope||e.kind==="EXPORT_AVAILABLE"||!e.to.endsWith(".test")||e.textHash!==sha(e.text)||e.htmlHash!==sha(e.html)||!/^https:\/\/[a-z0-9.-]+\.test\//.test(e.link)||e.providerKey.length>256)throw new Error("Invalid frozen Resend envelope");
 const tags=z.array(z.object({name:z.string().regex(/^[a-zA-Z0-9_-]{1,256}$/),value:z.string().regex(/^[a-zA-Z0-9_-]{1,256}$/)})).max(3).parse(value.tags);
 if(tags.length!==3||tags.find(t=>t.name==="notification_id")?.value!==e.notificationId||tags.find(t=>t.name==="account_binding")?.value!==c.account||!/^[a-f0-9]{64}$/.test(tags.find(t=>t.name==="intent_proof")?.value??"")||value.replyTo!=="support@example.test")throw new Error("Resend binding mismatch");
 return {from:e.from,to:[e.to],subject:e.subject,html:e.html,text:e.text,reply_to:value.replyTo,tags};
}
