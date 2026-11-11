import "server-only";
import { Pool } from "pg";
import { sha, type FrozenEnvelope } from "./envelope";
import { fingerprint, lookupKeys, requireSimulation } from "./simulation-config";
export type FakeBehavior="ACCEPT"|"REJECT"|"RATE_LIMIT"|"TIMEOUT_BEFORE"|"TIMEOUT_AFTER"|"CONNECTION_FAILURE"|"MALFORMED";
export type ProviderResult={type:"ACCEPTED";messageId:string}|{type:"REJECTED"}|{type:"RATE_LIMITED";retryAfterMs:number}|{type:"UNKNOWN"};
export interface NotificationProvider {send(e:FrozenEnvelope,now:Date,frozenIdentity?:{destinationDigest:string;keyVersion:string}):Promise<ProviderResult>;lookup(key:string):Promise<{messageId:string;hash:string;destination:string;accepted:boolean}|null>}
// Only local SQL. No Resend SDK, SMTP, fetch, HTTP client or DNS transport.
export class FakeResendProvider implements NotificationProvider {
 readonly pool:Pool;
 constructor(){requireSimulation();this.pool=new Pool({connectionString:process.env.COREOPS_NOTIFICATION_SIM_PROVIDER_URL,max:4,application_name:"workflowconnect-fake-provider"});}
 async initialize(){requireSimulation();await this.pool.query(`CREATE TABLE IF NOT EXISTS "FakeAdmission" (instance text PRIMARY KEY, approved boolean NOT NULL DEFAULT false);ALTER TABLE "FakeAdmission" ADD COLUMN IF NOT EXISTS scope text;CREATE TABLE IF NOT EXISTS "FakeEvidence" (scope text NOT NULL,id text NOT NULL,digest text NOT NULL,PRIMARY KEY(scope,id));ALTER TABLE "FakeEvidence" ADD COLUMN IF NOT EXISTS acknowledged boolean NOT NULL DEFAULT false;CREATE TABLE IF NOT EXISTS "FakeScenario" (notification text PRIMARY KEY, behavior text NOT NULL);CREATE TABLE IF NOT EXISTS "FakeReceipt" (scope text NOT NULL, key text NOT NULL, notification text NOT NULL, hash text NOT NULL, destination text NOT NULL, "keyVersion" text NOT NULL, "messageId" text NOT NULL, accepted boolean NOT NULL DEFAULT false, "firstAt" timestamptz NOT NULL, calls int NOT NULL DEFAULT 0, PRIMARY KEY(scope,key));`);}
 async setBehavior(notificationId:string,behavior:FakeBehavior){requireSimulation();if(!["ACCEPT","REJECT","RATE_LIMIT","TIMEOUT_BEFORE","TIMEOUT_AFTER","CONNECTION_FAILURE","MALFORMED"].includes(behavior))throw new Error("Invalid fake scenario");await this.pool.query('INSERT INTO "FakeScenario" VALUES($1,$2) ON CONFLICT(notification) DO UPDATE SET behavior=EXCLUDED.behavior',[notificationId,behavior]);}
 async admission(approve:boolean){const c=requireSimulation();await this.pool.query('INSERT INTO "FakeAdmission" (instance,approved,scope) VALUES($1,$2,$3) ON CONFLICT(instance) DO UPDATE SET approved=EXCLUDED.approved,scope=EXCLUDED.scope',[c.instance,approve,c.scope]);}
 async admitted(){return !!(await this.pool.query('SELECT approved FROM "FakeAdmission" WHERE instance=$1 AND scope=$2',[requireSimulation().instance,requireSimulation().scope])).rows[0]?.approved;}
 async records(){return (await this.pool.query('SELECT key,notification,hash FROM "FakeReceipt" WHERE scope=$1 ORDER BY key LIMIT 5001',[requireSimulation().scope])).rows as {key:string;notification:string;hash:string}[];}
 async rememberEvent(id:string,digest:string){const scope=requireSimulation().scope;await this.pool.query('INSERT INTO "FakeEvidence" (scope,id,digest) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[scope,id,digest]);return (await this.pool.query('SELECT digest FROM "FakeEvidence" WHERE scope=$1 AND id=$2',[scope,id])).rows[0].digest===digest;}
 async acknowledgeEvent(id:string,digest:string){await this.pool.query('UPDATE "FakeEvidence" SET acknowledged=true WHERE scope=$1 AND id=$2 AND digest=$3',[requireSimulation().scope,id,digest]);}
 async evidence(){return (await this.pool.query('SELECT id,digest,acknowledged FROM "FakeEvidence" WHERE scope=$1 ORDER BY id LIMIT 5001',[requireSimulation().scope])).rows as {id:string;digest:string;acknowledged:boolean}[];}
 async send(e:FrozenEnvelope,now:Date,frozenIdentity?:{destinationDigest:string;keyVersion:string}):Promise<ProviderResult>{
  const config=requireSimulation();if(e.providerScope!==config.scope||!e.to.endsWith(".test")||!await this.admitted())throw new Error("Fake provider admission denied");
  const behavior:FakeBehavior=(await this.pool.query('SELECT behavior FROM "FakeScenario" WHERE notification=$1',[e.notificationId])).rows[0]?.behavior??"ACCEPT";
  const keys=lookupKeys(),key=keys.find(k=>k.version===frozenIdentity?.keyVersion)??(!frozenIdentity?keys[0]:undefined);if(!key)throw new Error("Frozen digest key unavailable");const destination=fingerprint(key.key,e.to,"destination");if(frozenIdentity&&destination!==frozenIdentity.destinationDigest)throw new Error("Frozen destination conflict");const hash=sha(JSON.stringify(e)),messageId=`sim_${sha(`${config.scope}:${e.providerKey}`).slice(0,40)}`;
  const client=await this.pool.connect();
  try{await client.query('BEGIN');await client.query('INSERT INTO "FakeReceipt" (scope,key,notification,hash,destination,"keyVersion","messageId","firstAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',[config.scope,e.providerKey,e.notificationId,hash,destination,key.version,messageId,now]);
   const r=(await client.query('SELECT * FROM "FakeReceipt" WHERE scope=$1 AND key=$2 FOR UPDATE',[config.scope,e.providerKey])).rows[0];
   if(r.hash!==hash||r.notification!==e.notificationId||r.destination!==destination||r.keyVersion!==key.version||+now-+r.firstAt>=24*3600000)throw new Error("Fake idempotency conflict or window expired");
   await client.query('UPDATE "FakeReceipt" SET calls=calls+1 WHERE scope=$1 AND key=$2',[config.scope,e.providerKey]);
   if(r.accepted){await client.query('COMMIT');return {type:"ACCEPTED",messageId:r.messageId};}
   if(["ACCEPT","TIMEOUT_AFTER","MALFORMED"].includes(behavior))await client.query('UPDATE "FakeReceipt" SET accepted=true WHERE scope=$1 AND key=$2',[config.scope,e.providerKey]);
   await client.query('COMMIT');
   if(behavior==="REJECT")return {type:"REJECTED"};if(behavior==="RATE_LIMIT")return {type:"RATE_LIMITED",retryAfterMs:60000};
   if(["TIMEOUT_BEFORE","TIMEOUT_AFTER","CONNECTION_FAILURE","MALFORMED"].includes(behavior))return {type:"UNKNOWN"};
   return {type:"ACCEPTED",messageId};
  }catch{await client.query('ROLLBACK').catch(()=>{});throw new Error("Fake provider result unavailable");}finally{client.release();}
 }
 async lookup(key:string){const r=(await this.pool.query('SELECT "messageId",hash,destination,accepted FROM "FakeReceipt" WHERE scope=$1 AND key=$2',[requireSimulation().scope,key])).rows[0];return r??null;}
 async close(){await this.pool.end();}
}
