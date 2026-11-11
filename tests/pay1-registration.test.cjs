const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const load=Module._load,users=new Map();
let profile,admission,remote,verified=true,sessionStatus='active',mfa=true,role='SUPER_ADMIN',receiptCalls=0;
const db={
 $queryRaw:async(strings)=>strings.join('').includes('clock_timestamp')?[{now:new Date()}]:[],
 $transaction:async fn=>fn(db),
 pay1PreviewAdmission:{findUnique:async()=>{return admission;}},
 user:{
  findUnique:async({where})=>[...users.values()].find(u=>where.id?u.id===where.id:u.externalId===where.externalId)||null,
  findFirst:async({where})=>[...users.values()].find(u=>u.email.toLowerCase()===where.email.equals.toLowerCase())||null,
  upsert:async({where,create,update})=>{let user=users.get(where.externalId);user=user?{...user,...update}:{id:`local-${where.externalId}`,...create};users.set(where.externalId,user);return user;},
 },
 legalAcceptance:{findUnique:async()=>{receiptCalls++;throw Error('NO_LEGAL_RECEIPT_ALLOWED');},upsert:async()=>{receiptCalls++;throw Error('NO_LEGAL_RECEIPT_ALLOWED');}},
 platformAdmin:{findFirst:async()=>role?{id:'admin',userId:'local-user_Test',active:true,role}:null},
};
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name.endsWith('/db/prisma')||name==='@/server/db/prisma')return {prisma:db};
 if(name.endsWith('/routing/request-context'))return {requireCentralHost:async()=>({}),requestRoutingContext:async()=>{throw Error('NO_LEGAL_REDIRECT');}};
 if(name.endsWith('/auth-navigation'))return {authenticationDestination:async()=>'/sign-in'};
 if(name==='@clerk/nextjs')return {SignOutButton:props=>props.children};
 if(name.endsWith('/SiteLink'))return {default:props=>require('react').createElement('a',{href:props.href},props.children)};
 if(name.endsWith('/LegalLinks'))return {LegalLinks:()=>null};
 if(name==='@clerk/nextjs/server')return {auth:async()=>({userId:profile.signedOut?null:profile.id,sessionId:profile.signedOut?null:'synthetic-session',sessionClaims:{fva:mfa?[0,0]:[0,-1]},has:()=>mfa}),clerkClient:async()=>({sessions:{getSession:async()=>({userId:profile.id,status:sessionStatus,expireAt:Date.now()+60000})}}),currentUser:async()=>({...profile,primaryEmailAddress:{...profile.primaryEmailAddress,verification:{status:verified?'verified':'unverified'}}})};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return load.call(this,name,parent,main);
};
const target=require('../src/server/preview/pay1-config.ts');
const registration=require('../src/server/auth/clerk-configuration.ts');
const identity=require('../src/server/auth/get-current-user.ts');
const legal=require('../src/server/auth/legal-acceptance.ts');
const platform=require('../src/server/commercial/platform-auth.ts');
const baseline={NODE_ENV:'production',COREOPS_PAY1_PREVIEW_ENABLED:'true',VERCEL:'1',VERCEL_ENV:'preview',COREOPS_ENVIRONMENT:'preview',VERCEL_PROJECT_ID:'prj_Test',VERCEL_DEPLOYMENT_ID:'dpl_Test',COREOPS_PAY1_ADMISSION_ID:'pay1-test-only',DATABASE_URL:'postgresql://synthetic:synthetic@db.example.test/preview?sslmode=require',COREOPS_APP_ORIGIN:'https://pay1.example.test',COREOPS_MARKETING_ORIGIN:'https://pay1.example.test',COREOPS_PREVIEW_HOSTS:'pay1.example.test',COREOPS_ROUTING_MODE:'path',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64'),CLERK_SECRET_KEY:'sk_test_synthetic',COREOPS_LEGAL_DOCUMENTS_APPROVED:'false'};
function reset(){
 for(const key of Object.keys(process.env))if(/^(COREOPS_|PAYSTACK_|VERCEL|CLERK_|NEXT_PUBLIC_CLERK_)/.test(key))delete process.env[key];Object.assign(process.env,baseline);
 profile={id:'user_Test',firstName:'Synthetic',lastName:'Tester',imageUrl:null,twoFactorEnabled:true,legalAcceptedAt:null,primaryEmailAddress:{emailAddress:'synthetic@example.test'}};
 admission={...target.pay1Target(),actorExternalIds:['user_Test'],syntheticOnly:true,approvalReference:'SYNTHETIC:review',notBefore:new Date(Date.now()-60000),expiresAt:new Date(Date.now()+60000),revokedAt:null};
 remote={user_settings:{actions:{delete_self:false},sign_up:{legal_consent_enabled:false}}};verified=true;sessionStatus='active';mfa=true;role='SUPER_ADMIN';receiptCalls=0;users.clear();
}
test('PAY-1 registration exception is synthetic, scoped and never legal approval',async t=>{
 const saved={...process.env},fetch=global.fetch;global.fetch=async()=>({ok:true,json:async()=>remote});
 try{
 await t.test('admitted preview signup does not require production document, branding or consent flags',async()=>{reset();assert.equal(await registration.isRegistrationReady(),true);assert.equal(process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED,'false');});
 await t.test('missing/expired/revoked/wrong-target admission still closes signup',async()=>{
  for(const change of [()=>{admission=null;},()=>{admission.expiresAt=new Date(0);},()=>{admission.revokedAt=new Date();},()=>{admission.deploymentId='dpl_Other';}]){reset();change();assert.equal(await registration.isRegistrationReady(),false);}
 });
 await t.test('Clerk unavailability or enabled self-deletion still closes new registration',async()=>{reset();remote=null;assert.equal(await registration.isRegistrationReady(),false);reset();remote.user_settings.actions.delete_self=true;assert.equal(await registration.isRegistrationReady(),false);});
 await t.test('new verified allowlisted user provisions without a legal timestamp or fabricated receipt',async()=>{
  reset();const user=await identity.getCurrentUser();assert.equal(user.externalId,profile.id);assert.equal(users.size,1);assert.equal(receiptCalls,0);await legal.requireCurrentLegalReceipt(user.id);assert.equal(receiptCalls,0);
  const repeated=await identity.getCurrentUser();assert.equal(repeated.id,user.id);assert.equal(users.size,1);
 });
 await t.test('a Clerk signup is not authority to bypass actor admission',async()=>{reset();profile.id='user_Unlisted';await assert.rejects(identity.getCurrentUser());assert.equal(users.size,0);});
 await t.test('unverified email, revoked session and email collision remain denied',async()=>{
  reset();verified=false;await assert.rejects(identity.getCurrentUser());assert.equal(users.size,0);
  reset();sessionStatus='revoked';await assert.rejects(identity.getCurrentUser());assert.equal(users.size,0);
  reset();users.set('user_Other',{id:'other',externalId:'user_Other',email:profile.primaryEmailAddress.emailAddress});await assert.rejects(identity.getCurrentUser(),error=>error.code==='CONFLICT');assert.equal(users.size,1);
 });
 await t.test('test exception cannot manufacture acceptance even if approval flags are accidentally set',async()=>{reset();process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED='true';await assert.rejects(legal.recordLegalAcceptance(true,{termsVersion:'anything',privacyVersion:'anything'}));assert.equal(receiptCalls,0);});
 await t.test('platform role and strict MFA stay independent',async()=>{
  reset();await platform.requirePlatform('activate');mfa=false;await assert.rejects(platform.requirePlatform('activate'));mfa=true;role='BILLING_ADMIN';await assert.rejects(platform.requirePlatform('activate'));
 });
 await t.test('recovery shows current PAY-1 status rather than old legal timestamp barrier',async()=>{
  const Recovery=require('../src/app/account/recovery/page.tsx').default;
  // Inspect the server-returned tree; NODE_ENV changes in these config tests
  // intentionally mix test modes, so do not mount a mismatched React renderer.
  const renderToStaticMarkup=value=>{if(value==null)return '';if(typeof value==='string'||typeof value==='number')return String(value);if(Array.isArray(value))return value.map(renderToStaticMarkup).join(' ');return value.props?renderToStaticMarkup(value.props.children):'';};
  reset();let html=renderToStaticMarkup(await Recovery());assert.match(html,/Continue with your WorkflowConnect account/);assert.doesNotMatch(html,/LEGAL_ACCEPTANCE_REQUIRED/);
  reset();profile.id='user_Unlisted';html=renderToStaticMarkup(await Recovery());assert.match(html,/PAY1_ACTOR_NOT_ADMITTED/);assert.doesNotMatch(html,/synthetic@example.test|user_Unlisted/);
  reset();process.env.COREOPS_ENVIRONMENT='SENSITIVE_MARKER';html=renderToStaticMarkup(await Recovery());assert.match(html,/Settings requiring correction/);assert.match(html,/COREOPS_ENVIRONMENT/);assert.doesNotMatch(html,/SENSITIVE_MARKER|sk_test_synthetic/);
  reset();profile.signedOut=true;await assert.rejects(Recovery(),error=>String(error.digest).startsWith('NEXT_REDIRECT'));
 });
 await t.test('production and ordinary non-PAY-1 registration retain existing legal gates',async()=>{
  reset();process.env.VERCEL_ENV='production';assert.equal(await registration.isRegistrationReady(),false);await assert.rejects(identity.getCurrentUser());assert.equal(users.size,0);
  reset();process.env.COREOPS_PAY1_PREVIEW_ENABLED='false';assert.equal(await registration.isRegistrationReady(),false);await assert.rejects(identity.getCurrentUser());assert.equal(users.size,0);
 });
 }finally{process.env=saved;global.fetch=fetch;}
});
