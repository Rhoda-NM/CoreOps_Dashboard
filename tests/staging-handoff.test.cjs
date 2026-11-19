const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const {createRequest,validateRequest,sealSession,openSession,handoffTarget,setupAdministrator}=require('../src/server/staging/setup-handoff.ts');
const {prepare,consume}=require('../scripts/lib/staging-handoff-files.cjs');
const now=Date.now(),target={id:'synthetic-staging',projectId:'prj_Synthetic',origin:'https://staging.example.test',databaseHost:'synthetic.example.test:5432',databaseName:'synthetic',clerkHost:'synthetic.clerk.accounts.dev',branch:'test',revision:'a'.repeat(40)};
const manifest={approved:true,stagingId:target.id,clerkUserId:setupAdministrator,pricingApproval:'FOUNDER-2026-11-12-FINAL-PRICING-DECISION',syntheticTaxStatus:'NOT_REGISTERED',syntheticTaxApprovalReference:'Synthetic tax scenario',targetSeparationEvidence:'Synthetic isolated fixture',backupReference:'Synthetic fixture backup',syntheticDataEvidenceReference:'Synthetic records only',approvalReference:'Synthetic approved operation',validFrom:new Date(now-60000).toISOString(),validUntil:new Date(now+600000).toISOString()};
const token='SYNTHETIC_SESSION_SECRET_NOT_FOR_LOGS';
test('encrypted handoff is bound to the target, exact manifest, request key and short lifetime',()=>{
 const a=createRequest(manifest,target,now),b=createRequest(manifest,target,now),seal=sealSession(a.request,token,now+45000,now);
 assert.doesNotMatch(JSON.stringify(seal),new RegExp(token));assert.doesNotMatch(JSON.stringify(a.request),new RegExp(token+'|PRIVATE KEY'));
 assert.equal(openSession(seal,a.request,a.privateKey,now+1000).token,token);
 assert.throws(()=>openSession({...seal,tag:Buffer.alloc(16).toString('base64')},a.request,a.privateKey,now));
 assert.throws(()=>openSession(seal,b.request,b.privateKey,now));assert.throws(()=>openSession(seal,a.request,a.privateKey,now+46000));
 assert.throws(()=>validateRequest(a.request,{...target,databaseName:'other'},now));assert.throws(()=>validateRequest(a.request,{...target,revision:'b'.repeat(40)},now));
 assert.throws(()=>validateRequest({...a.request,manifest:{...manifest,approvalReference:'Changed approval'}},target,now));
 assert.throws(()=>validateRequest({...a.request,expiresAt:now+700000},target,now));
 assert.throws(()=>createRequest({...manifest,approved:false},target,now));
});
test('operator private key is outside Git, permission-restricted, consumed exclusively and deleted even after failed decryption',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'workflowconnect-handoff-'));fs.chmodSync(directory,0o700);
 const old=process.env.COREOPS_STAGING_BRANCH;process.env.COREOPS_STAGING_BRANCH=target.branch;
 try{
  assert.throws(()=>prepare(path.resolve('do-not-create.request.json'),manifest,target));
  const file=path.join(directory,'setup.request.json');prepare(file,manifest,target);
  const request=JSON.parse(fs.readFileSync(file)),download=path.join(directory,'authorization.json');
  assert.equal(fs.statSync(file+'.private.json').mode&0o777,0o600);
  fs.writeFileSync(download,JSON.stringify(sealSession(request,token,Date.now()+45000)),{mode:0o600});
  const outcomes=await Promise.allSettled([consume(file,download,manifest,target),consume(file,download,manifest,target)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(fs.existsSync(file+'.private.json'),false);
  await assert.rejects(consume(file,download,manifest,target));
  const bad=path.join(directory,'failed.request.json');prepare(bad,manifest,target);fs.writeFileSync(download,'{}');
  await assert.rejects(consume(bad,download,manifest,target));assert.equal(fs.existsSync(bad+'.private.json'),false);
 }finally{fs.rmSync(directory,{recursive:true,force:true});if(old===undefined)delete process.env.COREOPS_STAGING_BRANCH;else process.env.COREOPS_STAGING_BRANCH=old;}
});
let registryPresent=false,wrongDatabase=false;
let signedIn=true,role='SUPER_ADMIN',active=true,enrolled=true,strict=true,fva=[0,0],live=true,production=false;
const originalLoad=Module._load;
Module._load=function(n,p,m){
 if(n==='server-only')return {};
 if(n==='@clerk/nextjs/server')return {auth:async()=>({userId:signedIn?setupAdministrator:null,sessionId:signedIn?'synthetic-session':null,sessionClaims:{fva,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60},has:c=>{assert.deepEqual(c,{reverification:'strict_mfa'});return strict;},getToken:async()=>token}),currentUser:async()=>({id:setupAdministrator,twoFactorEnabled:enrolled,primaryEmailAddress:{verification:{status:'verified'}}}),clerkClient:async()=>({sessions:{getSession:async()=>({id:'synthetic-session',userId:setupAdministrator,status:live?'active':'revoked',expireAt:Date.now()+60000})}}),reverificationError:p=>({clerkReverification:p})};
 if(n.endsWith('/routing/request-context'))return {requireCentralHost:async()=>{}};
 if(n==='./config'&&p?.filename.endsWith('setup-authorization.ts'))return {stagingRequested:()=>true,stagingTarget:()=>{if(production)throw Error('STAGING_CONFIGURATION_REQUIRED');return target;}};
 if(n.endsWith('/db/prisma'))return {prisma:{$queryRaw:async()=>[{name:wrongDatabase?'other':target.databaseName}],stagingEnvironment:{findUnique:async()=>registryPresent?{id:target.id}:null},platformAdmin:{findFirst:async()=>active&&role==='SUPER_ADMIN'?{id:'synthetic-admin',role}:null}}};
 if(n.startsWith('@/'))n=path.resolve(__dirname,'../src',n.slice(2));
 return originalLoad.call(this,n,p,m);
};
const {authorizeSetupRequest}=require('../src/server/staging/setup-authorization.ts');
test('setup-only browser approval uses Clerk strict MFA and existing role; normal roles, missing factors and revoked sessions cannot obtain a token',async()=>{
 const old=process.env.COREOPS_STAGING_BRANCH;process.env.COREOPS_STAGING_BRANCH=target.branch;
 try{
  const fixture=createRequest(manifest,handoffTarget(target));
  strict=false;fva=[12,12];assert.deepEqual(await authorizeSetupRequest(fixture.request),{clerkReverification:'strict_mfa'});
  strict=true;fva=[0,0];const granted=await authorizeSetupRequest(fixture.request);assert.equal(granted.status,'authorized');assert.equal(openSession(granted.authorization,fixture.request,fixture.privateKey).token,token);
  for(const denied of [()=>{role='BILLING_ADMIN';},()=>{active=false;},()=>{enrolled=false;},()=>{live=false;},()=>{signedIn=false;}]){
   role='SUPER_ADMIN';active=true;enrolled=true;live=true;signedIn=true;denied();assert.deepEqual(await authorizeSetupRequest(fixture.request),{status:'denied'});
  }
  signedIn=true;live=true;enrolled=true;fva=[0,-1];strict=true;assert.deepEqual(await authorizeSetupRequest(fixture.request),{clerkReverification:'strict_mfa'});
  production=true;await assert.rejects(authorizeSetupRequest(fixture.request),/CONFIGURATION/);
 }finally{production=false;if(old===undefined)delete process.env.COREOPS_STAGING_BRANCH;else process.env.COREOPS_STAGING_BRANCH=old;}
});

test('initial-admin navigation is limited to missing registry, real database and existing verified SUPER_ADMIN',async()=>{
 const {initialStagingSetupRequired}=require('../src/server/staging/setup-authorization.ts');
 const old=process.env.COREOPS_STAGING_BRANCH;process.env.COREOPS_STAGING_BRANCH=target.branch;
 try{
  signedIn=true;role='SUPER_ADMIN';active=true;enrolled=true;live=true;strict=false;fva=[12,12];
  registryPresent=false;assert.equal(await initialStagingSetupRequired(),true);
  registryPresent=true;assert.equal(await initialStagingSetupRequired(),false);
  registryPresent=false;role='BILLING_ADMIN';assert.equal(await initialStagingSetupRequired(),false);
  role='SUPER_ADMIN';wrongDatabase=true;assert.equal(await initialStagingSetupRequired(),false);
  wrongDatabase=false;production=true;assert.equal(await initialStagingSetupRequired(),false);
 }finally{production=false;wrongDatabase=false;if(old===undefined)delete process.env.COREOPS_STAGING_BRANCH;else process.env.COREOPS_STAGING_BRANCH=old;}
});

test('ordinary administrator dashboard, platform and verification entry route to setup without granting platform access',async()=>{
 const old=process.env.COREOPS_STAGING_BRANCH;process.env.COREOPS_STAGING_BRANCH=target.branch;
 try{
  production=false;wrongDatabase=false;registryPresent=false;signedIn=true;role='SUPER_ADMIN';active=true;enrolled=true;live=true;strict=false;fva=[12,12];
  const modules=['../src/app/dashboard/page.tsx','../src/app/platform/(protected)/layout.tsx','../src/app/platform/verify/page.tsx','../src/app/platform/sign-in/[[...sign-in]]/page.tsx'];
  for(const file of modules){const Page=require(file).default;await assert.rejects(Page({children:'NO_PLATFORM_DATA'}),e=>e.digest?.includes('/platform/verify?setup=1'));}
 }finally{if(old===undefined)delete process.env.COREOPS_STAGING_BRANCH;else process.env.COREOPS_STAGING_BRANCH=old;}
});
