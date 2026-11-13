const {test}=require('node:test'),assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const {reverificationError}=require('@clerk/shared/authorization-errors');
const load=Module._load;
let signedIn,enrolled,fva,strict,admin,expired,hostAllowed,lookups,logs,findArgs,identityAvailable;
const target={id:'synthetic-marker-user',role:'SUPER_ADMIN',active:true};
const now=new Date();
const admission={id:'synthetic-admission',projectId:'prj_Synthetic',deploymentId:'dpl_Synthetic',origin:'https://synthetic.example.test',databaseHost:'synthetic.example.test:5432',databaseName:'synthetic',clerkHost:'synthetic.clerk.accounts.dev',syntheticOnly:true,approvalReference:'synthetic review',actorExternalIds:[target.id],notBefore:new Date(+now-60000),expiresAt:new Date(+now+60000),revokedAt:null};
const db={
 platformAdmin:{findFirst:async args=>{lookups++;findArgs=args;return admin?.active?admin:null;}},
 $queryRaw:async strings=>strings.join('').includes('clock_timestamp')?[{now}]:[],
 pay1PreviewAdmission:{findUnique:async()=>({...admission,expiresAt:expired?new Date(+now-1):admission.expiresAt})},
};
const redirect=url=>{throw Error('REDIRECT:'+url);};
const React=require('react');
let hookCalls=0;
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='@clerk/nextjs/server')return {reverificationError,auth:async()=>({userId:signedIn?target.id:null,sessionId:'synthetic-marker-session',sessionClaims:{fva},has:config=>{assert.deepEqual(config,{reverification:'strict_mfa'});return strict;}}),clerkClient:async()=>({sessions:{getSession:async()=>({userId:target.id,status:'active',expireAt:Date.now()+60000})}}),currentUser:async()=>identityAvailable?{id:target.id,twoFactorEnabled:enrolled,primaryEmailAddress:{emailAddress:'synthetic-marker@example.test',verification:{status:'verified'}}}:null};
 if(name==='@clerk/nextjs')return {SignIn:function SignIn(){},useReverification:fn=>{hookCalls++;return fn;}};
 if(name==='react'&&parent?.filename.endsWith('PlatformVerification.tsx'))return {...React,useState:initial=>[initial,()=>{}]};
 if(name==='next/navigation')return {redirect};
 if(name.endsWith('/routing/request-context'))return {requireCentralHost:async()=>{if(!hostAllowed)throw Error('HOST_DENIED');}};
 if(name.endsWith('/preview/pay1-config')||name==='./pay1-config')return {pay1Enabled:()=>true,pay1Target:()=>admission};
 if(name.endsWith('/db/prisma'))return {prisma:db};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return load.call(this,name,parent,main);
};
const {platformEntry,requirePlatform}=require('../src/server/commercial/platform-auth.ts');
const {verifyPlatformSession}=require('../src/app/platform/verify/actions.ts');
const VerifyPage=require('../src/app/platform/verify/page.tsx').default;
const SignInPage=require('../src/app/platform/sign-in/[[...sign-in]]/page.tsx').default;
const ProtectedLayout=require('../src/app/platform/(protected)/layout.tsx').default;
const {PlatformVerification}=require('../src/app/platform/verify/PlatformVerification.tsx');
function reset(){signedIn=true;enrolled=true;fva=[0,0];strict=true;admin=target;expired=false;hostAllowed=true;identityAvailable=true;lookups=0;logs=[];hookCalls=0;process.env.VERCEL_ENV='preview';process.env.COREOPS_PAY1_PREVIEW_ENABLED='true';}
function reason(){return JSON.parse(logs.at(-1)).reason;}
function find(tree,type){if(!tree)return [];if(Array.isArray(tree))return tree.flatMap(x=>find(x,type));if(typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...find(tree.props?.children,type)];}
test('platform strict MFA step-up, database roles and actual PAY-1 admission boundary',async t=>{
 const originalEnv={...process.env},info=console.info;console.info=line=>logs.push(line);
 try{
 await t.test('fresh enrolled SUPER_ADMIN is authorized and lookup is active/external-ID scoped',async()=>{reset();assert.equal((await requirePlatform('catalog')).id,target.id);assert.deepEqual(findArgs,{where:{active:true,user:{externalId:target.id,platformSuspended:false}}});assert.equal(reason(),'READY');assert.deepEqual(await verifyPlatformSession(),{status:'verified'});});
 await t.test('stale MFA denies data/services, redirects entry to step-up and returns supported SDK hint',async()=>{
  reset();fva=[12,12];strict=false;const entry=await platformEntry();assert.equal(entry.mfa,false);assert.equal(entry.canReverify,true);assert.equal(reason(),'MFA_STALE');await assert.rejects(requirePlatform('activate'),/REDIRECT:\/platform\/verify/);
  await assert.rejects(ProtectedLayout({children:'secret-data'}),/REDIRECT:\/platform\/verify/);await assert.rejects(SignInPage(),/REDIRECT:\/platform\/verify/);
  const tree=await VerifyPage();assert.equal(find(tree,PlatformVerification).length,1);assert.deepEqual(await verifyPlatformSession(),reverificationError('strict_mfa'));
  fva=[0,0];strict=true;assert.deepEqual(await verifyPlatformSession(),{status:'verified'});await assert.rejects(VerifyPage(),/REDIRECT:\/platform$/);
 });
 await t.test('enrollment alone cannot grant access; no enrollment cannot start privileged reverification',async()=>{reset();enrolled=false;assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(reason(),'MFA_NOT_ENROLLED');await assert.rejects(requirePlatform());await assert.rejects(VerifyPage(),/access-denied/);});
 await t.test('missing, invalid, unverified claims and SDK failure remain denied with distinct safe diagnostics',async()=>{
  for(const [claims,code]of [[undefined,'MFA_CLAIMS_MISSING'],[[0],'MFA_CLAIMS_INVALID'],[[0,-1],'MFA_NOT_VERIFIED'],[[0,0],'MFA_CHECK_FAILED']]){reset();fva=claims;strict=false;assert.equal((await platformEntry()).mfa,false);assert.equal(reason(),code);await assert.rejects(requirePlatform());assert.deepEqual(await verifyPlatformSession(),reverificationError('strict_mfa'));}
 });
 await t.test('SDK first-factor downgrade never satisfies the explicit two-factor claim fence',async()=>{reset();fva=[0,-1];strict=true;assert.equal((await platformEntry()).mfa,false);assert.equal(reason(),'MFA_NOT_VERIFIED');assert.deepEqual(await verifyPlatformSession(),reverificationError('strict_mfa'));await assert.rejects(requirePlatform());});
 await t.test('nonadmin and inactive-role lookup result cannot receive a challenge or platform content',async()=>{reset();admin=null;strict=false;assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(reason(),'ADMIN_NOT_FOUND');await assert.rejects(requirePlatform());await assert.rejects(VerifyPage(),/access-denied/);await assert.rejects(SignInPage(),/access-denied/);admin={...target,active:false};assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(reason(),'ADMIN_NOT_FOUND');});
 await t.test('expired real admission denies before admin lookup, including retries after a challenge',async()=>{reset();strict=false;fva=[12,12];assert.deepEqual(await verifyPlatformSession(),reverificationError('strict_mfa'));lookups=0;expired=true;strict=true;fva=[0,0];assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(reason(),'PAY1_WINDOW_CLOSED');assert.equal(lookups,0);await assert.rejects(requirePlatform());await assert.rejects(VerifyPage(),/access-denied/);});
 await t.test('role removal while MFA is in progress denies retried action',async()=>{reset();strict=false;assert.deepEqual(await verifyPlatformSession(),reverificationError('strict_mfa'));strict=true;admin=null;assert.deepEqual(await verifyPlatformSession(),{status:'denied'});});
 await t.test('role-specific permissions remain server enforced',async()=>{reset();admin={...target,role:'SUPPORT'};await assert.rejects(requirePlatform('catalog'));assert.equal((await requirePlatform('directory')).role,'SUPPORT');});
 await t.test('signed-out, failed identity and foreign hosts never obtain privileged access',async()=>{reset();signedIn=false;assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(lookups,0);await assert.rejects(VerifyPage(),/platform\/sign-in/);reset();identityAvailable=false;assert.deepEqual(await verifyPlatformSession(),{status:'denied'});assert.equal(reason(),'IDENTITY_UNAVAILABLE');assert.equal(lookups,0);reset();hostAllowed=false;await assert.rejects(verifyPlatformSession(),/HOST_DENIED/);assert.equal(lookups,0);});
 await t.test('client invokes supported reverification wrapper and fixed continuation after server success',async()=>{reset();const assign=global.window;let destination;global.window={location:{assign:value=>{destination=value;}}};try{const tree=PlatformVerification();assert.equal(hookCalls,1);await find(tree,'button')[0].props.onClick();assert.equal(destination,'/platform');}finally{if(assign===undefined)delete global.window;else global.window=assign;}});
 await t.test('diagnostics contain only closed reason/event strings and booleans, never sensitive markers',async()=>{reset();strict=false;await platformEntry();assert.equal(logs.length,1);const value=JSON.parse(logs[0]);assert.equal(value.event,'PLATFORM_ENTRY_CHECK');for(const [key,v]of Object.entries(value))if(!['event','reason'].includes(key))assert.equal(typeof v,'boolean');assert.doesNotMatch(logs.join(''),/synthetic-marker|@|fva":|token|session|email/i);process.env.VERCEL_ENV='production';await platformEntry();assert.equal(logs.length,1);});
 }finally{console.info=info;process.env=originalEnv;}
});
