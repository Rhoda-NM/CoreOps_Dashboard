const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const load=Module._load;
let row,app,now=new Date('2030-01-01T12:00:00Z');
const db={
 $queryRaw:async(strings)=>strings.join('').includes('clock_timestamp')?[{now}]:[],
 pay1PreviewAdmission:{findUnique:async()=>{return row;}},
 marketApplication:{findUniqueOrThrow:async()=>app},
 marketSubmission:{findUniqueOrThrow:async()=>({country:'KE'})},
 marketDecision:{findFirstOrThrow:async()=>({type:'OPEN_POLICY',effectiveAt:new Date('2030-01-01T11:00:00Z')})},
 workspace:{findUniqueOrThrow:async()=>({marketApplicationId:app?.id??null})},
};
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name.endsWith('/db/prisma'))return {prisma:db};
 if(name.endsWith('/auth/get-current-user'))return {getCurrentUser:async()=>{throw Error('IDENTITY_REQUIRED');}};
 if(name.endsWith('/commercial/platform-auth'))return {requirePlatform:async()=>{throw Error('PLATFORM_AUTH_REQUIRED');}};
 if(name.endsWith('/routing/request-context'))return {requireCentralHost:async()=>{}};
 if(name.endsWith('/routing/config'))return {runtimeRoutingPolicy:()=>({appOrigin:'https://pay1.example.test'})};
 return load.call(this,name,parent,main);
};
const config=require('../src/server/preview/pay1-config.ts');
const admission=require('../src/server/preview/pay1-admission.ts');
const market=require('../src/server/market/access.ts');
const gate=require('../src/server/market/config.ts');
const signature=require('../src/server/payments/paystack-signature.ts');
const {createHmac}=require('node:crypto');
const baseline={COREOPS_PAY1_PREVIEW_ENABLED:'true',VERCEL:'1',VERCEL_ENV:'preview',COREOPS_ENVIRONMENT:'preview',VERCEL_PROJECT_ID:'prj_Test',VERCEL_DEPLOYMENT_ID:'dpl_Test',COREOPS_PAY1_ADMISSION_ID:'pay1-test-only',DATABASE_URL:'postgresql://synthetic:synthetic@db.example.test/preview?sslmode=require',COREOPS_APP_ORIGIN:'https://pay1.example.test',COREOPS_MARKETING_ORIGIN:'https://pay1.example.test',COREOPS_PREVIEW_HOSTS:'pay1.example.test',COREOPS_ROUTING_MODE:'path',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64'),CLERK_SECRET_KEY:'sk_test_synthetic'};
function reset(){for(const k of Object.keys(process.env))if(/^(COREOPS_|PAYSTACK_|VERCEL|CLERK_|NEXT_PUBLIC_CLERK_)/.test(k))delete process.env[k];Object.assign(process.env,baseline);row={...config.pay1Target(),actorExternalIds:['user_Test','user_Admin'],notBefore:new Date('2030-01-01T10:00:00Z'),expiresAt:new Date('2030-01-01T14:00:00Z'),revokedAt:null,syntheticOnly:true,approvalReference:'SYNTHETIC:PAY1'};app={id:'case-test',pay1AdmissionId:row.id,applicant:{externalId:'user_Test'},createdAt:new Date('2030-01-01T11:00:00Z'),state:'APPROVED',currentDecisionId:'decision',operativeSubmissionId:'submission',latestSubmissionId:'submission'};}
test('PAY-1 scoped preview admission, no database or provider calls',async t=>{
 const saved={...process.env};const oldFetch=global.fetch;global.fetch=async()=>{throw Error('NETWORK_FORBIDDEN');};
 try{
 await t.test('target rejects production, custom environments, missing runtime identifiers and local spoofing',()=>{
  for(const patch of [{VERCEL_ENV:'production'},{COREOPS_ENVIRONMENT:'production'},{VERCEL_TARGET_ENV:'staging'},{VERCEL:''},{VERCEL_PROJECT_ID:''},{VERCEL_DEPLOYMENT_ID:''},{DATABASE_URL:'postgresql://u:p@localhost/preview?sslmode=require'},{DATABASE_URL:'postgresql://u:p@db.example.test/preview'},{COREOPS_APP_ORIGIN:'http://pay1.example.test'},{COREOPS_ROUTING_MODE:'subdomain'},{CLERK_SECRET_KEY:'sk_live_SYNTHETIC'},{PAYSTACK_LIVE_SECRET_KEY:'sk_live_SYNTHETIC'}]){reset();Object.assign(process.env,patch);assert.throws(config.pay1Target);}
 });
 await t.test('configuration reports individual failed names without values',()=>{
  reset();assert.deepEqual(config.pay1ConfigurationIssues(),[]);
  for(const key of ['VERCEL','VERCEL_ENV','COREOPS_ENVIRONMENT','VERCEL_PROJECT_ID','VERCEL_DEPLOYMENT_ID','COREOPS_PAY1_ADMISSION_ID','DATABASE_URL','COREOPS_APP_ORIGIN','COREOPS_ROUTING_MODE','COREOPS_MARKETING_ORIGIN','COREOPS_PREVIEW_HOSTS','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY']){
   const env={...baseline,[key]:'invalid!SENSITIVE_MARKER'};const issues=config.pay1ConfigurationIssues(env);assert.ok(issues.includes(key),key);assert.ok(issues.every(name=>!name.includes('SENSITIVE_MARKER')));
  }
  const issues=config.pay1ConfigurationIssues({...baseline,PAYSTACK_LIVE_SECRET_KEY:'sk_live_SENSITIVE_MARKER',COREOPS_NOTIFICATIONS_SEND_ENABLED:'true'});assert.ok(issues.includes('PAYSTACK_LIVE_SECRET_KEY'));assert.ok(issues.includes('COREOPS_NOTIFICATIONS_SEND_ENABLED'));
  process.env.COREOPS_ENVIRONMENT='SENSITIVE_MARKER';assert.throws(config.pay1Target,error=>error.reason==='PAY1_CONFIGURATION_REQUIRED'&&error.failedSettings.includes('COREOPS_ENVIRONMENT')&&!JSON.stringify(error).includes('SENSITIVE_MARKER'));
 });
 await t.test('all unrelated rehearsal, sending and lifecycle flags must remain disabled',()=>{
  for(const k of ['COREOPS_MARKET_REHEARSAL_ENABLED','COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED','COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED','COREOPS_LIFECYCLE_PROCESSING_ENABLED','COREOPS_SECURE_EXPORTS_ENABLED','COREOPS_NOTIFICATIONS_CAPTURE_ENABLED','COREOPS_NOTIFICATIONS_SEND_ENABLED','COREOPS_NOTIFICATIONS_SIMULATION_ENABLED','COREOPS_RESEND_ENGINEERING_ENABLED','PAYSTACK_LIVE_CHECKOUT_ENABLED']){reset();process.env[k]='true';assert.throws(config.pay1Target);}
 });
 await t.test('flag alone and mismatched database/deployment/Clerk identity cannot admit',async()=>{
  for(const field of ['id','projectId','deploymentId','origin','databaseHost','databaseName','clerkHost']){reset();row[field]='wrong';await assert.rejects(admission.requirePay1Admission(db));}
  reset();row=null;await assert.rejects(admission.requirePay1Admission(db));
 });
 await t.test('admission errors carry safe reasons without raw database details',async()=>{
  const {Prisma}=require('@prisma/client');const original=db.pay1PreviewAdmission.findUnique;
  try{
   reset();row=null;await assert.rejects(admission.requirePay1Admission(db),error=>error.reason==='PAY1_ADMISSION_REQUIRED');
   reset();row.deploymentId='dpl_Other';await assert.rejects(admission.requirePay1Admission(db),error=>error.reason==='PAY1_TARGET_MISMATCH');
   reset();db.pay1PreviewAdmission.findUnique=async()=>{throw new Prisma.PrismaClientKnownRequestError('SENSITIVE_MARKER',{code:'P2021',clientVersion:'fixture'});};
   await assert.rejects(admission.requirePay1Admission(db),error=>error.reason==='PAY1_SCHEMA_REQUIRED'&&!error.message.includes('SENSITIVE_MARKER'));
   db.pay1PreviewAdmission.findUnique=async()=>{throw new Prisma.PrismaClientKnownRequestError('SENSITIVE_MARKER',{code:'P2010',clientVersion:'fixture',meta:{code:'42P01'}});};await assert.rejects(admission.requirePay1Admission(db),error=>error.reason==='PAY1_SCHEMA_REQUIRED');
   db.pay1PreviewAdmission.findUnique=async()=>{throw new Error('SENSITIVE_MARKER');};await assert.rejects(admission.requirePay1Admission(db),error=>error.reason==='PAY1_ADMISSION_UNAVAILABLE'&&!error.message.includes('SENSITIVE_MARKER'));
  }finally{db.pay1PreviewAdmission.findUnique=original;}
 });
 await t.test('only explicit test actors and test-bound new cases admit',async()=>{
  reset();gate.requireMarketRehearsal();assert.equal((await admission.requirePay1Actor('user_Test',db)).id,row.id);
  await assert.rejects(admission.requirePay1Actor('user_Foreign',db));
  await admission.requirePay1Case(db,app.id);app.pay1AdmissionId=null;await assert.rejects(admission.requirePay1Case(db,app.id));
  reset();app.applicant.externalId='user_Foreign';await assert.rejects(admission.requirePay1Workspace(db,'workspace'));
  reset();app.createdAt=new Date('2029-01-01');await assert.rejects(admission.requirePay1Case(db,app.id));
 });
 await t.test('window boundaries and revocation deny new access but retain scoped reconciliation',async()=>{
  for(const patch of [{expiresAt:now},{revokedAt:now}]){reset();Object.assign(row,patch);await assert.rejects(admission.requirePay1Admission(db));await admission.requirePay1Workspace(db,'workspace',false);}
  reset();row.notBefore=new Date(+now+1);await assert.rejects(admission.requirePay1Admission(db));await assert.rejects(admission.requirePay1Workspace(db,'workspace',false));
  reset();row.revokedAt=now;app.pay1AdmissionId='different';await assert.rejects(admission.requirePay1Workspace(db,'workspace',false));
 });
 await t.test('current market authority is still required; money scope never substitutes for eligibility',async()=>{
  reset();await market.requireApplicationEligibility(db,app.id);
  for(const patch of [{state:'REVOKED'},{state:'SUBMITTED'},{currentDecisionId:null},{latestSubmissionId:'new-country'}]){reset();Object.assign(app,patch);await assert.rejects(market.requireApplicationEligibility(db,app.id));await admission.requirePay1Workspace(db,'workspace',false);}
  reset();db.marketDecision.findFirstOrThrow=async()=>({type:'APPROVE',effectiveAt:new Date('2030-01-01T11:00:00Z'),validUntil:new Date('2030-01-02')});await assert.rejects(market.requireApplicationEligibility(db,app.id));
  db.marketDecision.findFirstOrThrow=async()=>({type:'OPEN_POLICY',effectiveAt:new Date('2030-01-01T11:00:00Z')});
  db.marketSubmission.findUniqueOrThrow=async()=>({country:'US'});await assert.rejects(market.requireApplicationEligibility(db,app.id));db.marketSubmission.findUniqueOrThrow=async()=>({country:'KE'});
 });
 await t.test('legacy unlinked workspaces cannot become PAY-1 operational fixtures',async()=>{
  reset();app=null;await assert.rejects(market.requireWorkspaceMarket(db,'legacy'));
 });
 await t.test('modern raw-byte signatures, rotation candidates, stale timestamp and downgrade defense',()=>{
  const raw=Buffer.from('{"synthetic":true}'),ts=Math.floor(+now/1000),secret='whsec_SYNTHETIC';
  const sig=createHmac('sha512',secret).update(`${ts}.`).update(raw).digest('hex'),cfg={secret:'sk_test_SYNTHETIC',webhookSecret:secret,allowLegacy:true};
  assert.equal(signature.verifyPaystackSignature(raw,`t=${ts},v1=whk_old:${'0'.repeat(128)},v1=whk_new:${sig}`,null,cfg,+now),true);
  assert.equal(signature.verifyPaystackSignature(Buffer.from('{}'),`t=${ts},v1=whk_new:${sig}`,null,cfg,+now),false);
  assert.equal(signature.verifyPaystackSignature(raw,`t=${ts},v1=whk_new:${sig}`,null,cfg,+now+301000),false);
  const legacy=createHmac('sha512',cfg.secret).update(raw).digest('hex');assert.equal(signature.verifyPaystackSignature(raw,'invalid',legacy,cfg,+now),false);
 });
 await t.test('Test configuration rejects Live mode and wrong key prefixes before provider I/O',()=>{
  reset();const {paystackConfig}=require('../src/server/payments/paystack-config.ts');
  Object.assign(process.env,{PAYSTACK_TEST_SECRET_KEY:'sk_test_SYNTHETIC',PAYSTACK_TEST_MERCHANT_ID:'syntheticMerchant',PAYSTACK_TEST_CHANNELS:'card',PAYSTACK_TEST_CHECKOUT_ENABLED:'true',PAYSTACK_TEST_CAPABILITIES_APPROVAL:'SYNTHETIC',PAYSTACK_TEST_SETTLEMENT_APPROVAL:'SYNTHETIC'});
  assert.equal(paystackConfig('test',true).mode,'test');assert.throws(()=>paystackConfig('live'));process.env.PAYSTACK_TEST_SECRET_KEY='sk_live_SYNTHETIC';assert.throws(()=>paystackConfig('test'));
 });
 await t.test('direct review and policy service calls cannot enable manual market approvals',async()=>{
  reset();const service=require('../src/server/market/service.ts');
  await assert.rejects(service.reviewMarketApplication('case',{type:'APPROVE',expectedRevision:1,reason:'SYNTHETIC',operationKey:'SYNTHETIC-OPERATION'}),error=>error.code==='FORBIDDEN');
  await assert.rejects(service.configureMarketPolicy({version:'SYNTHETIC',countries:{US:'OPEN'},reason:'SYNTHETIC'}),error=>error.code==='FORBIDDEN');
 });
 await t.test('operator preparation is offline, explicit, bounded and SQL-escaped',()=>{
  reset();const {preparePay1Admission}=require('../scripts/pay1-admission-sql.cjs');
  const input={...config.pay1Target(),actorExternalIds:['user_Test'],approvalReference:"SYNTHETIC: quote' marker",notBefore:'2030-01-01T10:00:00Z',expiresAt:'2030-01-01T14:00:00Z',nonProductionVerified:true,syntheticActorsVerified:true};
  const sql=preparePay1Admission(input);assert.match(sql,/quote'' marker/);assert.doesNotMatch(sql,/ON CONFLICT|UPDATE|DELETE/);
  for(const patch of [{nonProductionVerified:false},{syntheticActorsVerified:false},{actorExternalIds:['user_Test','user_Test']},{expiresAt:input.notBefore},{origin:'http:\/\/pay1.example.test'}])assert.throws(()=>preparePay1Admission({...input,...patch}));
 });
 await t.test('disabled mode preserves local guards, never permits Vercel via local flag',()=>{
  reset();process.env.COREOPS_PAY1_PREVIEW_ENABLED='false';assert.throws(gate.requireMarketRehearsal);process.env.COREOPS_MARKET_REHEARSAL_ENABLED='true';assert.throws(gate.requireMarketRehearsal);
 });
 }finally{process.env=saved;global.fetch=oldFetch;}
});
