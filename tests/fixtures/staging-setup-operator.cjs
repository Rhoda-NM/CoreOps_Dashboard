/* eslint-disable @typescript-eslint/no-require-imports -- isolated subprocess substitutions */
// In-memory/database-file substitutions for CLI contract tests only. Never used by the app.
const fs=require('node:fs'),Module=require('node:module');
const {Prisma:{Decimal}}=require('@prisma/client');
const file=process.env.STAGING_HANDOFF_TEST_STATE;
if(!file||!file.startsWith('/tmp/workflowconnect-handoff-cli-'))throw Error('TEST_FIXTURE_ONLY');
let state=JSON.parse(fs.readFileSync(file));const persist=()=>fs.writeFileSync(file,JSON.stringify(state),{mode:0o600});
const admin={id:'synthetic-existing-admin',active:true,role:'SUPER_ADMIN',user:{externalId:'user_3LykI0tFI8Me3PRkkxOuLTUo5M2',platformSuspended:false}};
const match=(row,where={})=>Object.entries(where).every(([k,v])=>k==='effectiveFrom'?true:row[k]===v);
const tax=row=>row?{...row,effectiveFrom:new Date(row.effectiveFrom),rate:new Decimal(row.rate)}:null;
const offer=row=>row?{...row,amount:row.amount===null?null:new Decimal(row.amount)}:null;
const db={
 $executeRaw:async()=>0,$queryRaw:async strings=>String(strings).includes('_prisma_migrations')?[{migration_name:'20261112000500_staging_user_controls'}]:[{now:new Date(),completedAt:new Date()}],
 platformAdmin:{findFirst:async()=>admin,findUniqueOrThrow:async()=>admin,count:async()=>1},
 workspace:{count:async()=>0},
 stagingEnvironment:{findUnique:async()=>state.environment,upsert:async({create})=>{state.environment??={...create,active:true,syntheticOnly:true};return state.environment;}},
 subscriptionPlanOffer:{count:async()=>state.offers.length,findFirst:async({where})=>offer(state.offers.filter(r=>match(r,where)).sort((a,b)=>b.version-a.version)[0]),findMany:async({where})=>state.offers.filter(r=>match(r,where)).map(offer),create:async({data})=>{const row={id:'offer-'+state.offers.length,...data};state.offers.push(row);return offer(row);}},
 taxConfiguration:{findFirst:async()=>tax(state.tax),create:async({data})=>{state.tax={id:'tax-synthetic',...data};return tax(state.tax);}},
 platformAuditEvent:{findFirst:async({where})=>state.audits.find(r=>match(r,where)),create:async({data})=>{state.audits.push(data);return data;}},
 paymentReceivingAccount:{findUnique:async()=>({active:true,verifiedAt:new Date()})},
 $disconnect:async()=>{},
};
db.$transaction=async operation=>{const before=JSON.stringify(state);try{const result=await operation(db);persist();return result;}catch(e){state=JSON.parse(before);throw e;}};
const load=Module._load;
Module._load=function(n,p,m){
 if(n.endsWith('/db/prisma.ts'))return {prisma:db};
 if(n==='@clerk/backend')return {createClerkClient:()=>({authenticateRequest:async request=>{if(request.headers.get('authorization')!=='Bearer SYNTHETIC_PRIVATE_SESSION_MARKER')throw Error('TEST_TOKEN');return {status:'signed-in',toAuth:()=>({userId:admin.user.externalId,sessionId:'synthetic-session',tokenType:'session_token',sessionClaims:{fva:[0,0],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60,iss:'https://synthetic.clerk.accounts.dev',azp:'http://localhost:3000'},has:()=>process.env.STAGING_HANDOFF_TEST_STALE!=='true'})};},users:{getUser:async()=>({id:admin.user.externalId,twoFactorEnabled:true,primaryEmailAddressId:'p',emailAddresses:[{id:'p',emailAddress:'synthetic@example.test',verification:{status:'verified'}}]})},sessions:{getSession:async()=>({id:'synthetic-session',userId:admin.user.externalId,status:'active',expireAt:Date.now()+60000})}})};
 return load.call(this,n,p,m);
};
global.fetch=async()=>{throw Error('Outbound network forbidden in CLI fixture');};
