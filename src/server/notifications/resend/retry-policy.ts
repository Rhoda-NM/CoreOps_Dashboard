import type { ResendResult } from "./adapter";
export function resendRetryDecision(result:ResendResult,firstDispatchAt:Date,now:Date){
 const deadline=+firstDispatchAt+23*3600000;
 if(!Number.isFinite(deadline)||!Number.isFinite(+now))throw new Error("Invalid dispatch time");
 if(result.type==="ACCEPTED")return {action:"ACCEPTANCE_ONLY" as const};
 if(result.type==="UNKNOWN")return {action:"RECONCILE_UNKNOWN" as const};
 if(result.type==="REJECTED")return {action:"REVIEW_CONFIGURATION_OR_REJECTION" as const};
 const next=+now+Math.max(1000,result.retryAfterMs);return next>=deadline?{action:"REVIEW_SAFE_WINDOW" as const}:{action:"RETRY_IDENTICAL" as const,nextAttemptAt:new Date(next)};
}
