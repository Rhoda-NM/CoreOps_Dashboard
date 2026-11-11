import "server-only";
import { createHmac, createHash } from "node:crypto";
import { requireNotificationRehearsal } from "./config";
export function simulationKey(name:string){
 const value=process.env[name]??"",key=Buffer.from(value,"base64");
 if(key.length!==32||key.toString("base64")!==value)throw new Error("Simulation key unavailable");return key;
}
export function requireSimulation(){
 requireNotificationRehearsal();
 if(process.env.COREOPS_NOTIFICATIONS_SIMULATION_ENABLED!=="true")throw new Error("Simulation disabled");
 const provider=new URL(process.env.COREOPS_NOTIFICATION_SIM_PROVIDER_URL??"invalid:");
 const app=new URL(process.env.DATABASE_URL!);
 if(!["postgres:","postgresql:"].includes(provider.protocol)||!["localhost","127.0.0.1"].includes(provider.hostname)||!/^\/coreops_auth_rehearsal_sim_provider_[a-z0-9_]+$/.test(provider.pathname)||provider.pathname===app.pathname)throw new Error("Independent local fake provider required");
 const instance=process.env.COREOPS_NOTIFICATION_SIMULATION_INSTANCE??"",account=process.env.COREOPS_NOTIFICATION_SIM_ACCOUNT??"";
 if(!/^[a-f0-9-]{36}$/.test(instance)||!/^[a-f0-9-]{36}$/.test(account))throw new Error("Simulation instance unavailable");
 const origin=new URL(process.env.COREOPS_NOTIFICATION_SIM_CENTRAL_ORIGIN??"invalid:");
 if(origin.protocol!=="https:"||!origin.hostname.endsWith(".test")||origin.username||origin.password||origin.port||origin.pathname!=="/"||origin.search||origin.hash)throw new Error("Synthetic central origin required");
 const key=simulationKey("COREOPS_NOTIFICATION_SIMULATION_KEY");simulationKey("COREOPS_NOTIFICATION_SIM_WEBHOOK_KEY");
 return {instance,scope:`simulation:${provider.pathname.slice(1)}:${account}`,origin:origin.origin,keyVersion:createHash("sha256").update(key).digest("hex").slice(0,24)};
}
export function lookupKeys(){
 const current=simulationKey("COREOPS_NOTIFICATION_DIGEST_KEY");
 const previous=JSON.parse(process.env.COREOPS_NOTIFICATION_DIGEST_PREVIOUS_KEYS??"[]") as unknown;
 if(!Array.isArray(previous)||previous.length>4||previous.some(k=>typeof k!=="string"||Buffer.from(k,"base64").length!==32||Buffer.from(k,"base64").toString("base64")!==k))throw new Error("Lookup key review required");
 return [current,...previous.map((k:string)=>Buffer.from(k,"base64"))].map(key=>({key,version:`NB-v1:${createHmac("sha256",key).update("notification-lookup-key-version").digest("hex").slice(0,24)}`}));
}
export const fingerprint=(key:Buffer,value:string,purpose:string)=>createHmac("sha256",key).update(`${purpose}:${value}`).digest("hex");
